"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { TextArea } from "@/components/admin/ui";

/** Markdown editor with a sanitised live preview (raw HTML is never rendered). */
export function MarkdownField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className="flex flex-col gap-2">
      <div role="tablist" className="flex gap-2 text-xs">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 tracking-wider uppercase ${
              tab === t
                ? "bg-[#D7E2EA] text-[#0C0C0C]"
                : "border border-[#D7E2EA]/30"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "write" ? (
        <TextArea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-80 font-mono text-[13px]"
          placeholder={
            "## The problem\n\nWhat was hard, what you built, what changed…"
          }
        />
      ) : (
        <div className="markdown min-h-80 rounded-xl border border-[#D7E2EA]/25 p-4 text-sm leading-relaxed">
          {value.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="opacity-50">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
