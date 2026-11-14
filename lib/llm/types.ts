export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  maxTokens?: number;
  temperature?: number;
  /** ask the model for a single JSON object */
  json?: boolean;
  signal?: AbortSignal;
};

/** A provider answered "slow down" (HTTP 429) or is having a bad moment (5xx). */
export class RetryableError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Anything that can answer a chat: Groq, Gemini, or a fake in tests. */
export interface ChatModel {
  readonly name: string;
  stream(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<string>;
  complete(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
