import {
  RetryableError,
  type ChatMessage,
  type ChatModel,
  type ChatOptions,
} from "./types";
import { sseData } from "./sse";

const URL = "https://api.groq.com/openai/v1/chat/completions";

/** Groq (OpenAI-compatible API) over plain fetch. */
export class GroqModel implements ChatModel {
  readonly name = "groq";
  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private request(messages: ChatMessage[], o: ChatOptions, stream: boolean) {
    return this.fetchImpl(URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      signal: o.signal,
      body: JSON.stringify({
        model: this.model,
        messages,
        stream,
        // reasoning models spend part of the budget thinking, so leave headroom
        max_tokens: (o.maxTokens ?? 400) + 400,
        ...(this.model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        temperature: o.temperature ?? 0.2,
        ...(o.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  }

  private fail(status: number): never {
    if (status === 429 || status >= 500) {
      throw new RetryableError(`Groq ${status}`, status);
    }
    throw new Error(`Groq request failed (${status})`);
  }

  async *stream(
    messages: ChatMessage[],
    o: ChatOptions = {},
  ): AsyncGenerator<string> {
    const res = await this.request(messages, o, true);
    if (!res.ok || !res.body) this.fail(res.status);
    for await (const data of sseData(res.body)) {
      if (data === "[DONE]") return;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        // ignore keep-alive / malformed lines
      }
    }
  }

  async complete(
    messages: ChatMessage[],
    o: ChatOptions = {},
  ): Promise<string> {
    const res = await this.request(messages, o, false);
    if (!res.ok) this.fail(res.status);
    const json = await res.json();
    return String(json.choices?.[0]?.message?.content ?? "");
  }
}
