// Make sure you've reviewd the README.md file to understand the task and the RAG flow

import { AIHandler } from "../controllers/aiHandler";
import { articleHandler, pdfHandler, slackHandler } from "../controllers/resourcesHandler";
import sequelize from "../config/database";
import { QueryTypes } from "sequelize";

type RetrievedChunk = {
  id: number;
  source: string;
  source_id: string;
  chunk_index: number;
  chunk_content: string;
  distance: number;
};

const toVectorLiteral = (values: number[]): string => {
  // pgvector accepts bracketed vector literal, e.g. '[1,2,3]'
  return `[${values.join(",")}]`;
};


export const loadAllData = async () => {

  pdfHandler();
  articleHandler();
  slackHandler();
};

export const ask = async (userQuestion: string): Promise<string> => {
  // Embed the user question for both dimensions
  const [emb768, emb1536] = await Promise.all([
    AIHandler.getEmbeddings(userQuestion, 768),
    AIHandler.getEmbeddings(userQuestion, 1536),
  ]);

  // Prepare vector literals
  const vec768 = toVectorLiteral(emb768);
  const vec1536 = toVectorLiteral(emb1536);

  const TOP_K = 5;

  // Similarity search using pgvector for each embedding column
  const results768 = await sequelize.query<RetrievedChunk>(
    `
      SELECT id, source, source_id, chunk_index, chunk_content,
             (embeddings_768 <-> (:vec768)::vector) AS distance
      FROM knowledge_base
      WHERE embeddings_768 IS NOT NULL
      ORDER BY distance ASC
      LIMIT :k;
    `,
    {
      replacements: { vec768: vec768, k: TOP_K },
      type: QueryTypes.SELECT,
    }
  );

  const results1536 = await sequelize.query<RetrievedChunk>(
    `
      SELECT id, source, source_id, chunk_index, chunk_content,
             (embeddings_1536 <-> (:vec1536)::vector) AS distance
      FROM knowledge_base
      WHERE embeddings_1536 IS NOT NULL
      ORDER BY distance ASC
      LIMIT :k;
    `,
    {
      replacements: { vec1536: vec1536, k: TOP_K },
      type: QueryTypes.SELECT,
    }
  );

  // Merge and take the closest chunks overall
  const combined = [...results768, ...results1536]
    .sort((a, b) => a.distance - b.distance);

  const seen = new Set<number>();
  const top = [] as RetrievedChunk[];
  for (const r of combined) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      top.push(r);
      if (top.length >= TOP_K) break;
    }
  }

  if (top.length === 0) {
    return "No similar content found.";
  }

  const context = top
    .map((r, i) => `-- Chunk ${i + 1} | ${r.source}#${r.source_id} (d=${r.distance.toFixed(4)})\n${r.chunk_content}`)
    .join("\n\n");

  // Ask the AI to answer using only retrieved content
  const answer = await AIHandler.generateAnswer(context, userQuestion);
  return answer;
};
