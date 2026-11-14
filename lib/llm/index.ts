import { FallbackModel } from "./fallback";
import { GeminiModel } from "./gemini";
import { GroqModel } from "./groq";

/** Groq first, Gemini as the fallback; null when no key is configured. */
export function defaultChatModel(): FallbackModel | null {
  const groq = process.env.GROQ_API_KEY;
  const gemini = process.env.GEMINI_API_KEY;
  const g = gemini ? new GeminiModel(gemini) : null;
  if (groq) return new FallbackModel(new GroqModel(groq), g);
  return g ? new FallbackModel(g, null) : null;
}
