/** Cheap checks that run before any model is called. */

export const MAX_QUESTION_CHARS = 500;

export type GuardResult =
  | { ok: true; question: string }
  | { ok: false; reason: "empty" | "too_long" | "injection" };

// Phrases people use to hijack a model. This is one layer: the system prompt
// and the "answer only from the context" rule are the others.
const INJECTION: RegExp[] = [
  /ignore\s+(all\s+|any\s+|the\s+|your\s+|previous\s+|prior\s+|above\s+|earlier\s+)+(instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(all\s+|any\s+|the\s+|your\s+|previous\s+|prior\s+)+(instructions?|prompts?|rules?)/i,
  /forget\s+(everything|all|your)\s+(you|instructions?|rules?|prior)/i,
  /(reveal|show|print|repeat|output|leak|tell me)\s+(me\s+)?(your|the)\s+(system\s+|hidden\s+|initial\s+|original\s+)?(prompt|instructions?|rules?)/i,
  /what\s+(is|are|were)\s+your\s+(system\s+)?(prompt|instructions)/i,
  /you\s+are\s+now\s+(a|an|in|the)\b/i,
  /\b(act|behave|pretend)\s+(as|like)\s+(a|an|if)\b/i,
  /\bpretend\s+(you\s+are|you're|to\s+be)\b/i,
  /\b(developer|dan|jailbreak|god)\s+mode\b/i,
  /<\s*\/?\s*(system|assistant|context|instructions?)\s*>/i,
  /\[\s*(system|inst)\s*\]/i,
];

export function guardQuestion(raw: unknown): GuardResult {
  if (typeof raw !== "string") return { ok: false, reason: "empty" };
  const question = raw.replace(/\s+/g, " ").trim();
  if (!question) return { ok: false, reason: "empty" };
  if (question.length > MAX_QUESTION_CHARS)
    return { ok: false, reason: "too_long" };
  if (INJECTION.some((re) => re.test(question))) {
    return { ok: false, reason: "injection" };
  }
  return { ok: true, question };
}

/** Removes things that identify a person, before a question is logged. */
export function scrubPII(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[number]")
    .slice(0, MAX_QUESTION_CHARS);
}
