import {
  RetryableError,
  type ChatMessage,
  type ChatModel,
  type ChatOptions,
} from "./types";
import { sseData } from "./sse";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Gemini (REST) over plain fetch, used as the fallback model. */
export class GeminiModel implements ChatModel {
  readonly name = "gemini";
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.GEMINI_CHAT_MODEL ??
      "gemini-flash-lite-latest",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private body(messages: ChatMessage[], o: ChatOptions) {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    return JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      generationConfig: {
        maxOutputTokens: o.maxTokens ?? 400,
        temperature: o.temperature ?? 0.2,
        ...(o.json ? { responseMimeType: "application/json" } : {}),
      },
    });
  }

  private call(path: string, messages: ChatMessage[], o: ChatOptions) {
    return this.fetchImpl(`${BASE}/${this.model}:${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      signal: o.signal,
      body: this.body(messages, o),
    });
  }

  private fail(status: number): never {
    if (status === 429 || status >= 500) {
      throw new RetryableError(`Gemini ${status}`, status);
    }
    throw new Error(`Gemini request failed (${status})`);
  }

  private text(json: unknown): string {
    const parts = (
      json as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      }
    ).candidates?.[0]?.content?.parts;
    return (parts ?? []).map((p) => p.text ?? "").join("");
  }

  async *stream(
    messages: ChatMessage[],
    o: ChatOptions = {},
  ): AsyncGenerator<string> {
    const res = await this.call("streamGenerateContent?alt=sse", messages, o);
    if (!res.ok || !res.body) this.fail(res.status);
    for await (const data of sseData(res.body)) {
      try {
        const t = this.text(JSON.parse(data));
        if (t) yield t;
      } catch {
        // ignore
      }
    }
  }

  async complete(
    messages: ChatMessage[],
    o: ChatOptions = {},
  ): Promise<string> {
    const res = await this.call("generateContent", messages, o);
    if (!res.ok) this.fail(res.status);
    return this.text(await res.json());
  }
}
