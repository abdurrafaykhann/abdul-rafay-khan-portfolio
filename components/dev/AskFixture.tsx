"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Development only. Answers /api/ask with a scripted stream so the chat can
 * be reviewed without keys or a database. Restores the real fetch on leave.
 */
const ANSWER =
  "Sentinel is a video-surveillance system that flags violence in CCTV footage. Its classifier, trained on RWF-2000, reaches 79% recall and 81% precision on 400 held-out clips.";

function scripted(question: string): string[] {
  if (/capital|poem|ignore/i.test(question)) {
    return [
      JSON.stringify({
        t: "token",
        v: "I can only answer questions about Rafay and his work. Try asking about his projects, skills or education.",
      }),
      JSON.stringify({ t: "done", answered: false, sources: 0 }),
    ];
  }
  const words = ANSWER.split(/(?<= )/);
  return [
    JSON.stringify({
      t: "sources",
      sources: [
        { title: "Sentinel", url: "/dev/ask" },
        { title: "What I do", url: "/dev/ask#what-i-do" },
      ],
    }),
    ...words.map((v) => JSON.stringify({ t: "token", v })),
    JSON.stringify({ t: "done", answered: true, sources: 2 }),
  ];
}

export function AskFixture({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const real = window.fetch;
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (!url.includes("/api/ask")) return real(input, init);
      const question = JSON.parse(String(init?.body ?? "{}")).question ?? "";
      const lines = scripted(question);
      const enc = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(c) {
          for (const l of lines) {
            await new Promise((r) => setTimeout(r, 35));
            c.enqueue(enc.encode(l + "\n"));
          }
          c.close();
        },
      });
      return new Response(stream, {
        headers: { "content-type": "application/x-ndjson" },
      });
    };
    // the shim must be installed before the chat renders (dev-only fixture)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
    return () => {
      window.fetch = real;
    };
  }, []);

  return ready ? <>{children}</> : null;
}
