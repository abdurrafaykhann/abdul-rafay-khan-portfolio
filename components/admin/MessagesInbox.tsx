"use client";

import { Archive, Mail, MailOpen, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button, Notice } from "@/components/admin/ui";
import { deleteMessage, setMessageStatus } from "@/lib/admin/actions";
import type { AdminMessage } from "@/lib/admin/data";

const TABS = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export function MessagesInbox({
  messages: initial,
}: {
  messages: AdminMessage[];
}) {
  const [messages, setMessages] = useState(initial);
  const [tab, setTab] = useState<Tab>("new");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const counts = useMemo(
    () => ({
      new: messages.filter((m) => m.status === "new").length,
      read: messages.filter((m) => m.status === "read").length,
      archived: messages.filter((m) => m.status === "archived").length,
      all: messages.length,
    }),
    [messages],
  );
  const shown =
    tab === "all" ? messages : messages.filter((m) => m.status === tab);

  const setStatus = (m: AdminMessage, status: AdminMessage["status"]) =>
    start(async () => {
      const res = await setMessageStatus(m.id, status);
      if (!res.ok) return setError(res.error);
      setError(null);
      setMessages((all) =>
        all.map((x) => (x.id === m.id ? { ...x, status } : x)),
      );
    });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Messages
        </h1>
        <p className="mt-1 text-sm opacity-60">
          From the contact form. Reply from your own email.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Message status"
        className="flex flex-wrap gap-2 text-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 tracking-wider uppercase ${
              tab === t.key
                ? "bg-[#D7E2EA] text-[#0C0C0C]"
                : "border border-[#D7E2EA]/30"
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {shown.length === 0 ? (
        <Notice>{tab === "new" ? "No new messages." : "Nothing here."}</Notice>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((m) => (
            <li
              key={m.id}
              className={`rounded-3xl border p-5 ${
                m.status === "new"
                  ? "border-[#B600A8]/60"
                  : "border-[#D7E2EA]/15"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {m.name}
                    {m.status === "new" && (
                      <span className="ml-2 rounded-full bg-[#B600A8]/25 px-2 py-0.5 text-[0.65rem] tracking-wider text-fuchsia-100 uppercase">
                        New
                      </span>
                    )}
                  </p>
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`}
                    className="text-sm underline opacity-80"
                  >
                    {m.email}
                  </a>
                </div>
                <time dateTime={m.createdAt} className="text-xs opacity-55">
                  {fmt(m.createdAt)}
                </time>
              </div>
              {/* plain text only: never rendered as HTML */}
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
                {m.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
                {m.status !== "read" && (
                  <Button
                    variant="ghost"
                    className="text-xs"
                    disabled={pending}
                    onClick={() => setStatus(m, "read")}
                  >
                    <MailOpen className="size-4" aria-hidden /> Mark read
                  </Button>
                )}
                {m.status !== "new" && (
                  <Button
                    variant="ghost"
                    className="text-xs"
                    disabled={pending}
                    onClick={() => setStatus(m, "new")}
                  >
                    <Mail className="size-4" aria-hidden /> Mark unread
                  </Button>
                )}
                {m.status !== "archived" && (
                  <Button
                    variant="ghost"
                    className="text-xs"
                    disabled={pending}
                    onClick={() => setStatus(m, "archived")}
                  >
                    <Archive className="size-4" aria-hidden /> Archive
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="text-xs"
                  disabled={pending}
                  aria-label={`Delete message from ${m.name}`}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete the message from ${m.name}? This cannot be undone.`,
                      )
                    )
                      return;
                    start(async () => {
                      const res = await deleteMessage(m.id);
                      if (!res.ok) return setError(res.error);
                      setMessages((all) => all.filter((x) => x.id !== m.id));
                    });
                  }}
                >
                  <Trash2 className="size-4 text-red-300" aria-hidden /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
