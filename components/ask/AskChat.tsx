"use client";

import { useState } from "react";
import { useAsk } from "./useAsk";

export const STARTERS = [
  "What has Rafay built?",
  "What are his strongest skills?",
  "Tell me about the Sentinel project",
  "What did he study?",
];

/** A refusal has no sources worth showing. */
const REFUSAL = /^(that isn['’]t in my knowledge base|i can only answer)/i;

const field =
  "w-full rounded-[28px] border-2 border-[#D7E2EA]/40 bg-transparent px-6 py-3.5 text-base text-[#D7E2EA] outline-none placeholder:text-[#D7E2EA]/40 focus:border-[#D7E2EA]";

/** The chat itself: starter questions, an input, and the streamed answer with sources. */
export function AskChat({ autoFocus = false }: { autoFocus?: boolean }) {
  const { state, ask } = useAsk();
  const [text, setText] = useState("");
  const busy = state.status === "loading";

  const submit = (q: string) => {
    if (!q.trim() || busy) return;
    void ask(q);
    setText("");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
        {STARTERS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => submit(q)}
            className="text-mist cursor-pointer rounded-full border border-[#D7E2EA]/40 px-4 py-2 text-sm transition-colors hover:bg-[#D7E2EA]/10 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask a question about Rafay
        </label>
        <input
          id="ask-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          autoFocus={autoFocus}
          placeholder="Ask about Rafay's work…"
          autoComplete="off"
          className={field}
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-block shrink-0 cursor-pointer rounded-full px-8 py-3.5 text-sm font-medium tracking-widest text-white uppercase transition-[filter] duration-200 hover:brightness-110 disabled:opacity-60"
          style={{
            background:
              "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
            boxShadow:
              "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
            outline: "2px solid #FFFFFF",
            outlineOffset: "-3px",
          }}
        >
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>

      <div aria-live="polite" className="min-h-24">
        {state.question && (
          <p className="text-sm tracking-wide text-[#D7E2EA]/60">
            {state.question}
          </p>
        )}
        {state.status === "loading" && !state.answer && (
          <p className="mt-2 text-[#D7E2EA]/70">Thinking…</p>
        )}
        {state.answer && (
          <p className="text-mist mt-2 text-lg leading-relaxed whitespace-pre-wrap">
            {state.answer}
          </p>
        )}
        {state.status === "error" && state.error && (
          <p role="alert" className="mt-2 text-red-300">
            {state.error}
          </p>
        )}
        {state.status === "done" &&
          state.sources.length > 0 &&
          !REFUSAL.test(state.answer.trim()) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-[#D7E2EA]/60">Sources:</span>
              {state.sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  className="text-mist rounded-full border border-[#D7E2EA]/40 px-3 py-1 underline-offset-4 hover:bg-[#D7E2EA]/10"
                >
                  {s.title}
                </a>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
