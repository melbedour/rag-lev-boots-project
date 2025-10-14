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
        const prompt = `You are a helpful assistant.
Use ONLY the provided context to answer the question.
If the answer is not contained in the context, say you don't know.

Context:
${context}

Question: ${question}`;
       // log(prompt);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
log(response);

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
}
