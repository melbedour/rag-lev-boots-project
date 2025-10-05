// Make sure you've reviewd the README.md file to understand the task and the RAG flow

import { articleHandler, pdfHandler,slackHandler } from "../controllers/resourcesHandler";


export const loadAllData = async () => {

  pdfHandler();
  articleHandler();
  slackHandler();
};

export const ask = async (userQuestion: string): Promise<string> => {
  const placeholderAnswer = `Generate the answer based off the ${userQuestion}`;

  return placeholderAnswer;
};

