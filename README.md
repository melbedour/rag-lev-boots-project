# Running the project

- Ensure `concurrently` is installed (`npm install concurrently --save-dev`)
- Run `npm i`
- Run `npm run dev` - runs the front and backend concurrently with hot module
  and auto server reload
- See the UI at [http://localhost:5173/](http://localhost:5173/)

# Exercise: Lev-Boots RAG System

## Overview

Lev-Boots are a new invention that allow the wearer to levitate and hover
around. There are several resources about this new technology, its development,
and its applications.

Your task is to implement a Retrieval-Augmented Generation (RAG) system that
allows a user to ask and learn about these new boots.

The UI is already set up for you: you type a question, press enter, and it sends
it to the backend. Your task is to implement the entire RAG system on the
backend: from loading and embedding the resources, to retrieve the knowledge and
generate an answer.

Your entry point is in `ragService.ts`

---

## Setup

### Environment Variables

Create a `.env` file in the project root with DATABASE_URL and GEMINI_API_KEY
(or your preferred LLM)

- The database must be **Postgres with pgvector** (local or Supabase)
- Migrations run automatically when you start the server (including enabling the
  pg vector) – no manual step required aside from creating the DB

### Data Sources

You will populate your knowledge_base table with the following data:

- **3 PDFs**
  - All the PDFs are in the `/knowledge_pdfs` directory; read directly from
    there
  - `OpEd - A Revolution at Our Feet.pdf`
  - `Research Paper - Gravitational Reversal Physics.pdf`
  - `White Paper - The Development of Localized Gravity Reversal Technology.pdf`
- **5 articles**
  - All the articles are accessible in markdown format via this endpoint:
    `https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/ARTICLE_ID`
  - You'll have to replace ARTICLE_ID with the following IDs:
    `[military-deployment-report, urban-commuting, hover-polo, warehousing, consumer-safety]`
- **Slack API** (simulated API with pagination + rate limiting)
  - This API limits how much data it returns per query, so you will have to
    paginate through
  - There are three different slack channels
  - Example access:
    - `https://lev-boots-slack-api.jona-581.workers.dev/?channel=lab-notes&page=1`
    - `https://lev-boots-slack-api.jona-581.workers.dev/?channel=engineering&page=2`
    - `https://lev-boots-slack-api.jona-581.workers.dev/?channel=offtopic&page=3`

### LLM via API

You will also need API access to an LLM. You can use any you like, but if you
want something for free (with rate limiting), you can use Google's Gemini

- Here is a simple guide to setting it up:
  https://ai.google.dev/gemini-api/docs/quickstart#javascript
- You will need an API key which you can get for free here:
  https://aistudio.google.com/app/apikey?
  - Press the `Create API Key` button on the top right
- **Note** as per the Gemini documentation, you can reduce token usage (hence
  increase your rate limit) by disabling thinking. For this project, it's safe
  to turn thinking off.
  - To turn thinking off, add the following to your API request:

```
    config: {
      thinkingConfig: {
        thinkingBudget: 0, // Disables thinking
      },
    }
```

---

## Requirements

Ultimately, you need to implement the two functions below

#### `loadAllData`

- Fetch all sources
- Chunk content into manageable pieces (400 words)
- Embed chunks (Gemini embeddings or another embedding model)
- Store chunks + embeddings into the `knowledge_base` table

#### `ask(userQuestion)`

- Embed the question
- Run a similarity search on the DB
- Construct a prompt using the retrieved chunks
- Ask the LLM to answer the user question **based only on retrieved content**
- Return the answer to the UI

## Notes

1. I recommend you split your work to separate files - one (likely more) for
   loading, chunking, embedding, and storing the data, and another for answering
   the question

2. Since there is quite a lot of data to embed, you will be hitting the gemini
   API quite a lot. To avoid hitting rate limits, it's probably a good idea to
   start with something small, make sure it works, and avoid re-sending already
   embedded data so you can save tokens

3. This is a big project, but it's 100% feasible. You've got this =]
