"use client";

import { useCallback, useRef, useState } from "react";
import type { AskEvent, Source } from "@/lib/ask/answer";

export type AskState = {
  status: "idle" | "loading" | "done" | "error";
  question: string;
  answer: string;
  sources: Source[];
  error: string | null;
};

const IDLE: AskState = {
  status: "idle",
  question: "",
  answer: "",
  sources: [],
  error: null,
};

/** Sends a question to /api/ask and reads the streamed answer. */
export function useAsk() {
  const [state, setState] = useState<AskState>(IDLE);
  const abort = useRef<AbortController | null>(null);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ ...IDLE, status: "loading", question: q });

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const message =
          res.status === 429
            ? (body.error ?? "Please try again a little later.")
            : res.status === 503
              ? "The assistant isn't available right now. Please use the contact form."
              : "Something went wrong. Please try again.";
        setState((s) => ({ ...s, status: "error", error: message }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const apply = (e: AskEvent) =>
        setState((s) => {
          if (e.t === "token") return { ...s, answer: s.answer + e.v };
          if (e.t === "sources") return { ...s, sources: e.sources };
          if (e.t === "error")
            return { ...s, status: "error", error: e.message };
          return s.status === "error" ? s : { ...s, status: "done" };
        });
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) apply(JSON.parse(line) as AskEvent);
        }
      }
      setState((s) => (s.status === "loading" ? { ...s, status: "done" } : s));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        status: "error",
        error:
          "Couldn't reach the assistant. Check your connection and try again.",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    setState(IDLE);
  }, []);

  return { state, ask, reset };
}
