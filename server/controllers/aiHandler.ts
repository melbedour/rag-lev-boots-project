import { GoogleGenAI } from "@google/genai";
import { log } from "console";

export class AIHandler {

    static getEmbeddings = async (content: string, outputDimensionality: number): Promise<number[]> => {
        const ai = new GoogleGenAI({});
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: content,
            config: { outputDimensionality: outputDimensionality },

        });
        return response.embeddings![0].values!
    }

    static generateAnswer = async (context: string, question: string): Promise<string> => {
        const ai = new GoogleGenAI({});
        const prompt = `You are a helpful, friendly assistant. Answer conversationally in 2–4 sentences by default.
Use ONLY the provided context to answer the question. If the answer is not in the context, say you don't know.
Prefer plain language and short sentences. If listing multiple points, use brief bullet points. Do not invent facts.`;
        context = `Context: ${context}`;

        question = `Question: ${question}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt, context, question],
            config: {
                temperature: 0.2,
                maxOutputTokens: 512,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
        

        // Try to extract text in a robust way across SDK versions
        // @ts-ignore – different SDK versions expose different shapes
        const outputText: string | undefined = response.outputText
            // @ts-ignore
            || response.text
            // @ts-ignore
            || (response.candidates && Array.isArray(response.candidates)
                // @ts-ignore
                ? response.candidates.map((c: any) => (c.content?.parts || [])
                    .map((p: any) => p.text || '')
                    .join('')).join('\n')
                : undefined);
        return (outputText && String(outputText).trim()) || "I don't know based on the provided context.";
    }

    static generateAnswerWithHistory = async (
        context: string,
        question: string,
        history?: { user: string; assistant: string }[],
    ): Promise<string> => {
        const ai = new GoogleGenAI({});
        const prompt = `You are a helpful, friendly assistant. Answer conversationally in 2-4 sentences by default.\nUse ONLY the provided context and conversation history to answer the question. If the answer is not in the context/history, say you don't know.\nPrefer plain language and short sentences. If listing multiple points, use brief bullet points. Do not invent facts.`;

        const historyBlock = (history && history.length)
            ? `Conversation History (most recent last):\n` + history.map((t, i) => `Turn ${i + 1}\nUser: ${t.user}\nAssistant: ${t.assistant}`).join("\n\n")
            : "";

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt, historyBlock, `Context:\n${context}`, `Question: ${question}`],
            config: {
                temperature: 0.2,
                maxOutputTokens: 512,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        // @ts-ignore
        const outputText: string | undefined = response.outputText
            // @ts-ignore
            || response.text
            // @ts-ignore
            || (response.candidates && Array.isArray(response.candidates)
                // @ts-ignore
                ? response.candidates.map((c: any) => (c.content?.parts || [])
                    .map((p: any) => p.text || '')
                    .join('')).join('\n')
                : undefined);
        return (outputText && String(outputText).trim()) || "I don't know based on the provided context.";
    }
}
