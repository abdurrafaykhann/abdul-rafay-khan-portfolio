import type { ChatModel } from "@/lib/llm/types";
import type { Retrieved } from "@/lib/rag/sync";
import { guardQuestion, type GuardResult } from "./guard";
import { buildMessages } from "./prompt";

export type Source = { title: string; url: string };

export type AskEvent =
  | { t: "sources"; sources: Source[] }
  | { t: "token"; v: string }
  | { t: "done"; answered: boolean; sources: number }
  | { t: "error"; message: string };

export const NOT_IN_KB =
  "That isn't in my knowledge base. Please use the contact form below and Rafay will answer you.";
export const OFF_TOPIC =
  "I can only answer questions about Rafay and his work. Try asking about his projects, skills or education.";
export const BUSY =
  "The assistant is busy right now. Please try again in a minute, or use the contact form.";

const REFUSALS: Record<Exclude<GuardResult, { ok: true }>["reason"], string> = {
  empty: "Please type a question.",
  too_long: "That question is a bit long. Please keep it under 500 characters.",
  injection: OFF_TOPIC,
};

/** Unique links to pages (case studies, sections) the answer drew on. */
export function sourcesFrom(
  hits: (Pick<Retrieved, "title" | "sourceUrl"> & { similarity?: number })[],
): Source[] {
  // only pages about as relevant as the best match
  const top = Math.max(...hits.map((h) => h.similarity ?? 0), 0);
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const h of hits) {
    if (!h.sourceUrl || seen.has(h.sourceUrl)) continue;
    if (h.similarity !== undefined && h.similarity < top - 0.1) continue;
    seen.add(h.sourceUrl);
    out.push({ title: h.title, url: h.sourceUrl });
  }
  return out.slice(0, 4);
}

type Deps = {
  question: unknown;
  retrieve: (question: string) => Promise<Retrieved[]>;
  model: ChatModel;
  /** hits below this are treated as "not in the knowledge base" */
  minSimilarity?: number;
};

/**
 * Answers one question as a stream of events:
 * guard → retrieve → (nothing relevant → say so) → stream the model's answer.
 */
export async function* ask({
  question,
  retrieve,
  model,
  minSimilarity = 0.55,
}: Deps): AsyncGenerator<AskEvent> {
  const guarded = guardQuestion(question);
  if (!guarded.ok) {
    yield { t: "token", v: REFUSALS[guarded.reason] };
    yield { t: "done", answered: false, sources: 0 };
    return;
  }

  let hits: Retrieved[];
  try {
    hits = (await retrieve(guarded.question)).filter(
      (h) => h.similarity >= minSimilarity,
    );
  } catch {
    yield { t: "error", message: BUSY };
    return;
  }

  if (hits.length === 0) {
    yield { t: "token", v: NOT_IN_KB };
    yield { t: "done", answered: false, sources: 0 };
    return;
  }

  const sources = sourcesFrom(hits);
  yield { t: "sources", sources };
  let produced = false;
  try {
    for await (const chunk of model.stream(
      buildMessages(guarded.question, hits),
    )) {
      produced = true;
      yield { t: "token", v: chunk };
    }
  } catch {
    if (!produced) {
      yield { t: "error", message: BUSY };
      return;
    }
  }
  yield { t: "done", answered: produced, sources: sources.length };
}
