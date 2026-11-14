import {
  RetryableError,
  type ChatMessage,
  type ChatModel,
  type ChatOptions,
} from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tries the primary model; on a rate limit or server error retries with
 * exponential backoff (2 retries), then switches to the secondary. Once a
 * model has started producing text, a failure is not retried (the visitor
 * has already seen part of an answer).
 */
export class FallbackModel implements ChatModel {
  readonly name: string;
  /** which model actually answered the last call */
  used: string;
  constructor(
    private readonly primary: ChatModel,
    private readonly secondary: ChatModel | null,
    private readonly backoffMs = 400,
  ) {
    this.name = primary.name;
    this.used = primary.name;
  }

  async *stream(
    messages: ChatMessage[],
    o: ChatOptions = {},
  ): AsyncGenerator<string> {
    this.used = this.primary.name;
    for (let attempt = 0; attempt <= 2; attempt++) {
      let started = false;
      try {
        for await (const chunk of this.primary.stream(messages, o)) {
          started = true;
          yield chunk;
        }
        return;
      } catch (e) {
        if (started || !(e instanceof RetryableError)) throw e;
        if (attempt < 2) await sleep(this.backoffMs * 2 ** attempt);
      }
    }
    if (!this.secondary) {
      throw new RetryableError("The AI service is busy.", 429);
    }
    this.used = this.secondary.name;
    yield* this.secondary.stream(messages, o);
  }

  async complete(
    messages: ChatMessage[],
    o: ChatOptions = {},
  ): Promise<string> {
    this.used = this.primary.name;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        return await this.primary.complete(messages, o);
      } catch (e) {
        if (!(e instanceof RetryableError)) throw e;
        if (attempt < 2) await sleep(this.backoffMs * 2 ** attempt);
      }
    }
    if (!this.secondary) {
      throw new RetryableError("The AI service is busy.", 429);
    }
    this.used = this.secondary.name;
    return this.secondary.complete(messages, o);
  }
}
