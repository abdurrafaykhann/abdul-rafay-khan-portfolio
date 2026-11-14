import { CHUNK_CHARS, CHUNK_OVERLAP_CHARS } from "./config";

type Options = { maxChars?: number; overlapChars?: number };

/** Splits markdown into sections at headings, keeping each heading's text. */
function sections(md: string): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = [];
  let heading = "";
  let lines: string[] = [];
  const flush = () => {
    const body = lines.join("\n").trim();
    if (body) out.push({ heading, body });
    lines = [];
  };
  for (const line of md.replace(/\r\n/g, "\n").split("\n")) {
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[1].trim();
    } else {
      lines.push(line);
    }
  }
  flush();
  return out;
}

/** Cuts a long body into pieces of at most `max` chars, preferring paragraph and sentence ends. */
function windows(body: string, max: number, overlap: number): string[] {
  if (body.length <= max) return [body];
  const out: string[] = [];
  let start = 0;
  while (start < body.length) {
    let end = Math.min(start + max, body.length);
    if (end < body.length) {
      const slice = body.slice(start, end);
      const cut = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf(". "),
        slice.lastIndexOf("\n"),
      );
      if (cut > max * 0.5) end = start + cut + 1;
    }
    const piece = body.slice(start, end).trim();
    if (piece) out.push(piece);
    if (end >= body.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return out;
}

/**
 * Chunks markdown for retrieval: split on headings, then into ~400-token
 * windows with ~60 tokens of overlap. Every chunk starts with the document
 * title (and section heading) so it still makes sense on its own.
 */
export function chunkMarkdown(
  title: string,
  md: string,
  { maxChars = CHUNK_CHARS, overlapChars = CHUNK_OVERLAP_CHARS }: Options = {},
): string[] {
  const text = md.trim();
  if (!text) return [];
  const chunks: string[] = [];
  for (const s of sections(text)) {
    const prefix =
      s.heading && s.heading !== title ? `${title} — ${s.heading}` : title;
    const room = Math.max(200, maxChars - prefix.length - 2);
    for (const piece of windows(
      s.body,
      room,
      Math.min(overlapChars, room / 2),
    )) {
      chunks.push(`${prefix}\n${piece}`);
    }
  }
  return chunks;
}
