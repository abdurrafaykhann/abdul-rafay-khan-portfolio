import {
  RetryableError,
  type ChatMessage,
  type ChatModel,
  type ChatOptions,
} from "./types";

/** Scripted model for tests (no network). Each call takes the next script entry. */
export class FakeChatModel implements ChatModel {
  calls: ChatMessage[][] = [];
  constructor(
    private readonly script: (string | Error)[] = ["ok"],
    readonly name = "fake",
  ) {}

  private next(messages: ChatMessage[]): string {
    this.calls.push(messages);
    const item =
      this.script[Math.min(this.calls.length - 1, this.script.length - 1)];
    if (item instanceof Error) throw item;
    return item;
  }

  async *stream(
    messages: ChatMessage[],
    _o?: ChatOptions,
  ): AsyncGenerator<string> {
    void _o;
    const text = this.next(messages);
    for (const word of text.split(/(?<= )/)) yield word;
  }

  async complete(messages: ChatMessage[], _o?: ChatOptions): Promise<string> {
    void _o;
    return this.next(messages);
  }
}

export const rateLimited = () => new RetryableError("429", 429);
