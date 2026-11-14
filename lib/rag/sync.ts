import { createHash } from "node:crypto";
import type { KbDocument } from "./documents";
import { assertDim, type Embedder } from "./embed";

export type NewChunk = {
  sourceType: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  content: string;
  hash: string;
  embedding: number[];
};

export type StoredChunk = {
  id: string;
  sourceType: string;
  sourceId: string;
  hash: string;
  createdAt: string;
};

/** Where chunks live (Supabase in production, memory in tests). */
export interface KbStore {
  list(): Promise<StoredChunk[]>;
  insert(rows: NewChunk[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
}

export type SyncResult = {
  sources: number;
  chunks: number;
  added: number;
  kept: number;
  removed: number;
};

/** Content hash: an unchanged chunk is never embedded again. */
export function chunkHash(
  doc: Pick<KbDocument, "title" | "sourceUrl">,
  content: string,
) {
  return createHash("sha256")
    .update(`${doc.title}\n${doc.sourceUrl ?? ""}\n${content}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Makes the store match `docs` exactly:
 *  - new or changed chunks are embedded and added (unchanged ones are kept);
 *  - chunks of sources that are gone (unpublished, deleted) or whose text
 *    changed are removed.
 * New chunks are written before old ones are removed, so a failed embedding
 * call never leaves the knowledge base empty.
 */
export async function syncIndex(
  store: KbStore,
  embedder: Embedder,
  docs: KbDocument[],
  { force = false }: { force?: boolean } = {},
): Promise<SyncResult> {
  let existing = await store.list();
  let removed = 0;

  if (force && existing.length) {
    await store.remove(existing.map((c) => c.id));
    removed += existing.length;
    existing = [];
  }

  const have = new Set(
    existing.map((c) => `${c.sourceType}|${c.sourceId}|${c.hash}`),
  );
  const wanted = new Set<string>();
  const fresh: Omit<NewChunk, "embedding">[] = [];
  let chunks = 0;

  for (const doc of docs) {
    for (const content of doc.chunks) {
      const hash = chunkHash(doc, content);
      const key = `${doc.sourceType}|${doc.sourceId}|${hash}`;
      if (wanted.has(key)) continue; // identical chunk twice in one source
      wanted.add(key);
      chunks++;
      if (!have.has(key)) {
        fresh.push({
          sourceType: doc.sourceType,
          sourceId: doc.sourceId,
          sourceUrl: doc.sourceUrl,
          title: doc.title,
          content,
          hash,
        });
      }
    }
  }

  if (fresh.length) {
    const vectors = await embedder.embedDocuments(fresh.map((c) => c.content));
    if (vectors.length !== fresh.length) {
      throw new Error("The embedder returned the wrong number of vectors.");
    }
    await store.insert(
      fresh.map((c, i) => ({ ...c, embedding: assertDim(vectors[i]) })),
    );
  }

  const stale = existing.filter(
    (c) => !wanted.has(`${c.sourceType}|${c.sourceId}|${c.hash}`),
  );
  if (stale.length) {
    await store.remove(stale.map((c) => c.id));
    removed += stale.length;
  }

  return {
    sources: docs.length,
    chunks,
    added: fresh.length,
    kept: chunks - fresh.length,
    removed,
  };
}

/** In-memory store for tests. */
export class MemoryStore implements KbStore {
  rows: (NewChunk & { id: string; createdAt: string })[] = [];
  private n = 0;

  async list(): Promise<StoredChunk[]> {
    return this.rows.map((r) => ({
      id: r.id,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      hash: r.hash,
      createdAt: r.createdAt,
    }));
  }
  async insert(rows: NewChunk[]) {
    for (const r of rows) {
      this.rows.push({
        ...r,
        id: `c${++this.n}`,
        createdAt: new Date().toISOString(),
      });
    }
  }
  async remove(ids: string[]) {
    const gone = new Set(ids);
    this.rows = this.rows.filter((r) => !gone.has(r.id));
  }
}

/** Cosine similarity of two unit vectors (a plain dot product). */
export function similarity(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export type Retrieved = {
  sourceType: string;
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  content: string;
  similarity: number;
};

/** Ranks chunks for a query, dropping anything below `threshold` (memory store version). */
export async function retrieveFromMemory(
  store: MemoryStore,
  embedder: Embedder,
  query: string,
  { k = 6, threshold = 0 }: { k?: number; threshold?: number } = {},
): Promise<Retrieved[]> {
  const q = await embedder.embedQuery(query);
  return store.rows
    .map((r) => ({ r, s: similarity(q, r.embedding) }))
    .filter((x) => x.s >= threshold)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(({ r, s }) => ({
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      sourceUrl: r.sourceUrl,
      title: r.title,
      content: r.content,
      similarity: s,
    }));
}
