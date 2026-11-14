/** Embedding settings. The kb_chunks column is vector(768): change both together. */
export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 768;

/** ~400 tokens with ~60 overlap, at roughly 4 characters per token. */
export const CHUNK_CHARS = 1600;
export const CHUNK_OVERLAP_CHARS = 240;
