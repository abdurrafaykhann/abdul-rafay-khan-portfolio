"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SortableList } from "@/components/admin/SortableList";
import { Button, Notice } from "@/components/admin/ui";
import { reorder, setProjectFlag } from "@/lib/admin/actions";

export type MarqueeProject = {
  id: string;
  title: string;
  published: boolean;
  /** has a clip or poster, so something can actually show */
  hasMedia: boolean;
};

/** Which projects appear in the scrolling rows on the home page, and in what order. */
export function MarqueeManager({
  inMarquee: initial,
  others,
}: {
  inMarquee: MarqueeProject[];
  others: MarqueeProject[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [rest, setRest] = useState(others);
  const [notice, setNotice] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, start] = useTransition();

  const toggle = (p: MarqueeProject, on: boolean) =>
    start(async () => {
      const res = await setProjectFlag(p.id, "show_in_marquee", on);
      if (!res.ok) return setNotice({ tone: "error", text: res.error });
      if (on) {
        setItems((a) => [...a, p]);
        setRest((r) => r.filter((x) => x.id !== p.id));
      } else {
        setRest((r) => [...r, p]);
        setItems((a) => a.filter((x) => x.id !== p.id));
      }
      router.refresh();
    });

  const visible = items.filter((p) => p.published && p.hasMedia).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Marquee
        </h1>
        <p className="mt-1 text-sm opacity-60">
          The two scrolling rows of clips on the home page. Drag to set the
          order. Clips repeat to fill the rows, and the whole strip is hidden
          while nothing can be shown.
        </p>
      </div>
      {visible === 0 && (
        <Notice tone="info">
          The marquee is hidden right now: it needs at least one published
          project with a clip or poster image.
        </Notice>
      )}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <section aria-label="In the marquee" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest uppercase opacity-70">
          In the marquee ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-sm opacity-60">
            Nothing yet. Add a project below.
          </p>
        ) : (
          <SortableList
            items={items}
            disabled={pending}
            getLabel={(p) => p.title}
            onReorder={(next) => {
              setItems(next);
              start(async () => {
                const res = await reorder(
                  "marquee",
                  next.map((p) => p.id),
                );
                setNotice(
                  res.ok
                    ? { tone: "success", text: "Order saved." }
                    : { tone: "error", text: res.error },
                );
              });
            }}
            renderItem={(p) => (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs opacity-55">
                    {!p.published ? "Draft: not shown yet. " : ""}
                    {!p.hasMedia
                      ? "No clip or poster: add one in the project editor."
                      : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="text-xs"
                  disabled={pending}
                  onClick={() => toggle(p, false)}
                >
                  Remove
                </Button>
              </div>
            )}
          />
        )}
      </section>

      {rest.length > 0 && (
        <section aria-label="Other projects" className="flex flex-col gap-3">
          <h2 className="text-sm font-medium tracking-widest uppercase opacity-70">
            Add a project
          </h2>
          <ul className="flex flex-col gap-2">
            {rest.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-[#D7E2EA]/15 p-3"
              >
                <span className="min-w-0 flex-1 truncate">
                  {p.title}
                  {!p.hasMedia && (
                    <span className="ml-2 text-xs opacity-55">
                      (no clip or poster yet)
                    </span>
                  )}
                </span>
                <Button
                  className="text-xs"
                  disabled={pending}
                  onClick={() => toggle(p, true)}
                >
                  Add
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
