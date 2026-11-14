import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchContent } from "@/lib/data/fetch-content";
import { serviceSupabase } from "@/lib/supabase/server";
import { buildDocuments } from "./documents";
import { defaultEmbedder, type Embedder } from "./embed";
import {
  syncIndex,
  type KbStore,
  type NewChunk,
  type Retrieved,
  type StoredChunk,
  type SyncResult,
} from "./sync";

const PAGE = 1000;
const IN_LIMIT = 100;

/** The Supabase-backed store (service role; kb_chunks is never readable by anon). */
export class SupabaseKbStore implements KbStore {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<StoredChunk[]> {
    const out: StoredChunk[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.db
        .from("kb_chunks")
        .select("id, source_type, source_id, hash, created_at")
        .order("created_at")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        out.push({
          id: r.id,
          sourceType: r.source_type,
          sourceId: r.source_id,
          hash: r.hash,
          createdAt: r.created_at,
        });
      }
      if (!data || data.length < PAGE) return out;
    }
  }

  async insert(rows: NewChunk[]): Promise<void> {
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50).map((r) => ({
        source_type: r.sourceType,
        source_id: r.sourceId,
        source_url: r.sourceUrl,
        title: r.title,
        content: r.content,
        hash: r.hash,
        embedding: `[${r.embedding.join(",")}]`,
      }));
      const { error } = await this.db.from("kb_chunks").upsert(batch, {
        onConflict: "source_type,source_id,hash",
        ignoreDuplicates: true,
      });
      if (error) throw new Error(error.message);
    }
  }

  async remove(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i += IN_LIMIT) {
      const { error } = await this.db
        .from("kb_chunks")
        .delete()
        .in("id", ids.slice(i, i + IN_LIMIT));
      if (error) throw new Error(error.message);
    }
  }
}

export type ReindexOutcome =
  | { ok: true; result: SyncResult }
  | {
      ok: false;
      reason: "no-database" | "no-embedding-key" | "failed";
      message: string;
    };

/**
 * Makes the knowledge base match what is published right now. Cheap when
 * nothing changed (only hashes are compared, nothing is embedded), so it runs
 * after every content save. Never throws.
 */
export async function reindex({
  force = false,
  embedder,
}: { force?: boolean; embedder?: Embedder } = {}): Promise<ReindexOutcome> {
  const db = serviceSupabase();
  if (!db) {
    return {
      ok: false,
      reason: "no-database",
      message: "The service key is not set.",
    };
  }
  const emb = embedder ?? defaultEmbedder();
  if (!emb) {
    return {
      ok: false,
      reason: "no-embedding-key",
      message: "GEMINI_API_KEY is not set.",
    };
  }
  try {
    const content = await fetchContent(db); // published only
    const { data, error } = await db
      .from("projects")
      .select("client_name, industry")
      .eq("hide_client_name", true)
      .not("client_name", "is", null);
    if (error) throw new Error(error.message);
    const hidden = (data ?? [])
      .filter((r) => typeof r.client_name === "string")
      .map((r) => ({
        name: r.client_name as string,
        industry: (r.industry as string | null) ?? null,
      }));
    const docs = buildDocuments(content, { hiddenClientNames: hidden });
    const result = await syncIndex(new SupabaseKbStore(db), emb, docs, {
      force,
    });
    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[reindex]", message);
    return { ok: false, reason: "failed", message };
  }
}

/** Nearest chunks to a question (used by Ask My AI and the matcher). */
export async function retrieve(
  query: string,
  {
    k = 6,
    threshold = 0.5,
    embedder,
  }: { k?: number; threshold?: number; embedder?: Embedder } = {},
): Promise<Retrieved[]> {
  const db = serviceSupabase();
  const emb = embedder ?? defaultEmbedder();
  if (!db || !emb) return [];
  const vector = await emb.embedQuery(query);
  const { data, error } = await db.rpc("match_chunks", {
    query_embedding: `[${vector.join(",")}]`,
    match_count: k,
    min_similarity: threshold,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(
    (r: {
      source_type: string;
      source_id: string;
      source_url: string | null;
      title: string;
      content: string;
      similarity: number;
    }) => ({
      sourceType: r.source_type,
      sourceId: r.source_id,
      sourceUrl: r.source_url,
      title: r.title,
      content: r.content,
      similarity: r.similarity,
    }),
  );
}

export type KnowledgeStatus = {
  databaseReady: boolean;
  embeddingKeyReady: boolean;
  total: number;
  bySource: { sourceType: string; chunks: number; sources: number }[];
  lastIndexed: string | null;
};

export async function knowledgeStatus(): Promise<KnowledgeStatus> {
  const db = serviceSupabase();
  const base = {
    databaseReady: !!db,
    embeddingKeyReady: !!process.env.GEMINI_API_KEY,
  };
  if (!db) return { ...base, total: 0, bySource: [], lastIndexed: null };
  const rows = await new SupabaseKbStore(db).list();
  const groups = new Map<string, { chunks: number; ids: Set<string> }>();
  let last: string | null = null;
  for (const r of rows) {
    const g = groups.get(r.sourceType) ?? { chunks: 0, ids: new Set<string>() };
    g.chunks++;
    g.ids.add(r.sourceId);
    groups.set(r.sourceType, g);
    if (!last || r.createdAt > last) last = r.createdAt;
  }
  return {
    ...base,
    total: rows.length,
    bySource: [...groups.entries()]
      .map(([sourceType, g]) => ({
        sourceType,
        chunks: g.chunks,
        sources: g.ids.size,
      }))
      .sort((a, b) => a.sourceType.localeCompare(b.sourceType)),
    lastIndexed: last,
  };
}
