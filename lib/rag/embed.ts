import { EMBEDDING_DIM, EMBEDDING_MODEL } from "./config";

/** Anything that can turn text into 768-d unit vectors (Gemini for real, a fake in tests). */
export interface Embedder {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

/** Reduced-dimension Gemini vectors are not unit length, so normalise them. */
export function l2Normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm === 0 ? v : v.map((x) => x / norm);
}

/** Fails loudly if the model and the database column disagree on size. */
export function assertDim(v: number[]): number[] {
  if (v.length !== EMBEDDING_DIM) {
    throw new Error(
      `Embedding has ${v.length} dimensions but the database column is vector(${EMBEDDING_DIM}).`,
    );
  }
  return v;
}

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const BATCH = 50;

type Fetch = typeof fetch;

export class GeminiEmbedder implements Embedder {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: Fetch = fetch,
  ) {}

  private async batch(texts: string[], taskType: string): Promise<number[][]> {
    const body = JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: EMBEDDING_DIM,
      })),
    });
    for (let attempt = 0; ; attempt++) {
      const res = await this.fetchImpl(
        `${ENDPOINT}/models/${EMBEDDING_MODEL}:batchEmbedContents`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body,
        },
      );
      if (res.status === 429 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Embedding request failed (${res.status}).`);
      }
      const json = (await res.json()) as {
        embeddings?: { values: number[] }[];
      };
      const rows = json.embeddings ?? [];
      if (rows.length !== texts.length) {
        throw new Error("Embedding response had the wrong number of vectors.");
      }
      return rows.map((r) => assertDim(l2Normalize(r.values)));
    }
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      out.push(
        ...(await this.batch(texts.slice(i, i + BATCH), "RETRIEVAL_DOCUMENT")),
      );
    }
    return out;
  }

  async embedQuery(text: string): Promise<number[]> {
    return (await this.batch([text], "RETRIEVAL_QUERY"))[0];
  }
}

/** The real embedder, or null when no key is configured. */
export function defaultEmbedder(): Embedder | null {
  const key = process.env.GEMINI_API_KEY;
  return key ? new GeminiEmbedder(key) : null;
}
