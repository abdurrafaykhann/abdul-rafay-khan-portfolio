"use client";

import dynamic from "next/dynamic";

/** The chat UI is its own chunk, fetched only when it is needed. */
export const AskChatLazy = dynamic(
  () => import("./AskChat").then((m) => m.AskChat),
  {
    ssr: false,
    loading: () => (
      <p className="text-[#D7E2EA]/60" role="status">
        Loading…
      </p>
    ),
  },
);
