import path from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { pdfToText } from 'pdf-ts';
import KnowledgeBase from '../models/KnowledgeBase';
import { log } from 'node:console';
import { AIHandler } from './aiHandler';

// Basic heuristics to skip low‑value content before embedding + storing
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const looksLikeSystemMsg = (s: string) => /joined the channel|left the channel|set the channel|added to the channel/i.test(s);
const stripUrls = (s: string) => s.replace(/https?:\/\/\S+/gi, '');
const nonAlnumRatio = (s: string) => {
  const total = s.length || 1;
  const nonAlnum = (s.match(/[^\p{L}\p{N}\s]/gu) || []).length;
  return nonAlnum / total;
};
const stopPhrases = new Set([
  'ok','okay','thanks','thank you','thx','lol','yup','yep','nope','nice','cool','great','awesome','👍','👌','😀','😂','😭','…','...'
]);
const isInformative = (raw: string): boolean => {
  if (!raw) return false;
  const text = normalize(raw);
  if (!text) return false;
  if (looksLikeSystemMsg(text)) return false;

  // Very short messages are unlikely to be useful
  const words = text.split(' ').filter(Boolean);
  if (words.length < 8) return false;

  // If after stripping URLs there is almost nothing, skip
  const noUrls = normalize(stripUrls(text));
  if (noUrls.split(' ').filter(Boolean).length < 5) return false;

  // If dominated by punctuation/symbols, skip
  if (nonAlnumRatio(text) > 0.5) return false;

  // Common low-signal replies
  const lower = text.toLowerCase();
  if (stopPhrases.has(lower)) return false;

  // Looks acceptable
  return true;
};

const WORDS_PER_CHUNK = 400;
const PDF_EXTENSION = '.pdf';

type KnowledgeRecord = {
  source: string;
  source_id: string;
  chunk_index: number;
  chunk_content: string;
  embeddings_768: number[];
  embeddings_1536: number[];
};

export const pdfHandler = async (): Promise<KnowledgeBase[]> => {
  const knowledgeDir = "C:\\Users\\Adam\\source\\repos\\rag-lev-boots-project\\server\\knowledge_pdfs";
  const entries = await readdir(knowledgeDir);
  const records: KnowledgeRecord[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith(PDF_EXTENSION)) {
      continue;
    }

    const filePath = path.join(knowledgeDir, entry);
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) {
      continue;
    }

    const fileBuffer = await readFile(filePath);
    const text = await pdfToText(fileBuffer);
    const words = text.split(/\s+/).filter(Boolean);

    for (let chunkIndex = 0; chunkIndex < words.length; chunkIndex += WORDS_PER_CHUNK) {
      const chunkWords = words.slice(chunkIndex, chunkIndex + WORDS_PER_CHUNK);
      if (chunkWords.length === 0) {
        continue;
      }

      const chunkNumber = chunkIndex / WORDS_PER_CHUNK;
      const chunkContent = chunkWords.join(' ');
      const norm = normalize(chunkContent);
      if (!isInformative(norm)) continue;
      if (seen.has(norm)) continue; // de-dup identical chunks
      seen.add(norm);
      records.push({
        source: entry,
        source_id: `${path.parse(entry).name}-${chunkNumber}`,
        chunk_index: chunkNumber,
        chunk_content: norm,
        embeddings_768: await AIHandler.getEmbeddings(chunkContent, 768),
        embeddings_1536: [],
      });
      await new Promise(f => setTimeout(f, 100));
    }
  }

  if (records.length === 0) {
    return [];
  }

  const chunks = await KnowledgeBase.bulkCreate(records, { returning: true });
  return chunks;
};

export const articleHandler = async (): Promise<KnowledgeBase[]> => {
  const baseUrl = "https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/";
  var articles = ["military-deployment-report", "urban-commuting", "hover-polo", "warehousing", "consumer-safety"];
  const records: KnowledgeRecord[] = [];
  const seen = new Set<string>();
  for (var i = 0; i < articles.length; i++) {
    var url = `${baseUrl}article-${i + 1}_${articles[i]}.md`;
    log(url);
    var text = await ((await fetch(url)).text());
    // log(text);
    const words = text.split(/\s+/).filter(Boolean);
    for (let chunkIndex = 0; chunkIndex < words.length; chunkIndex += WORDS_PER_CHUNK) {
      const chunkWords = words.slice(chunkIndex, chunkIndex + WORDS_PER_CHUNK);
      if (chunkWords.length === 0) {
        continue;
      }
      const chunkNumber = chunkIndex / WORDS_PER_CHUNK;
      const chunkContent = chunkWords.join(' ');
      const norm = normalize(chunkContent);
      if (!isInformative(norm)) continue;
      if (seen.has(norm)) continue;
      seen.add(norm);
      log("Chunk " + chunkNumber)
      records.push({
        source: articles[i],
        source_id: `${path.parse(articles[i]).name}-${chunkNumber}`,
        chunk_index: chunkNumber,
        chunk_content: norm,
        embeddings_768: await AIHandler.getEmbeddings(chunkContent, 768),
        embeddings_1536: []
      });
      await new Promise(f => setTimeout(f, 100));
    }
  }

  if (records.length === 0) {
    return [];
  }

  const chunks = await KnowledgeBase.bulkCreate(records, { returning: true });
  return [];
};
export const slackHandler = async (): Promise<KnowledgeBase[]> => {
  const baseUrl = "https://lev-boots-slack-api.jona-581.workers.dev/?";
  var channels = ['lab-notes', 'engineering', 'offtopic'];
  var calls = 0;
  for (var i = 0; i < channels.length; i++) {
  var records: KnowledgeRecord[] = [];
  const seen = new Set<string>();
    var index = 0;
    var page = 1;
    var hasMore = true;
    do {
      if (calls > 9) {
        await new Promise(f => setTimeout(f, 10000));
        calls = 0;
      }
      var url = `${baseUrl}channel=${channels[i]}&page=${page}`;
      log(url);
      var text = await ((await fetch(url)).json());
      for (var item of text['items']) {
        log(index);
        const norm = normalize(item.text || '');
        if (!isInformative(norm)) { index++; continue; }
        if (seen.has(norm)) { index++; continue; }
        seen.add(norm);
        var entry = {
          source: `Slack-${channels[i]}`,
          source_id: `${(channels[i])}-${index}`,
          chunk_index: index,
          chunk_content: norm,
          embeddings_768: await AIHandler.getEmbeddings(norm, 768),
          embeddings_1536: []
        };
        records.push(entry)
        await new Promise(f => setTimeout(f, 100));

        //  await KnowledgeBase.create(entry, { returning: true });
        index++;
      }
      calls++
      hasMore = parseInt(text['total']) > parseInt(text['limit']) * (page);
      log(parseInt(text['total']), parseInt(text['limit']), page)
      page++;
      //    log(text);
    } while (hasMore);
    await KnowledgeBase.bulkCreate(records, { returning: true });
    records = [];
  }
  log("done");

  return []
};
