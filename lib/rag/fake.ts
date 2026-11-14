import { createHash } from "node:crypto";
import { EMBEDDING_DIM } from "./config";
import { l2Normalize, type Embedder } from "./embed";

/**
 * Deterministic stand-in for tests (no network): a hashed bag of words, so
 * texts sharing words are close and unrelated texts are far apart.
 */
export class FakeEmbedder implements Embedder {
  calls = 0;

  private vector(text: string): number[] {
    const v = new Array<number>(EMBEDDING_DIM).fill(0);
    for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
      const h = createHash("sha1").update(word).digest();
      v[h.readUInt16BE(0) % EMBEDDING_DIM] += 1;
      v[h.readUInt16BE(2) % EMBEDDING_DIM] += 0.5;
    }
    return l2Normalize(v);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    this.calls += texts.length;
    return texts.map((t) => this.vector(t));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.vector(text);
  }
}
