"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SortableList } from "@/components/admin/SortableList";
import { Button, Notice } from "@/components/admin/ui";
import { reorder, setProjectFlag } from "@/lib/admin/actions";
import type { AdminProject } from "@/lib/admin/data";
import { KEY_PROJECT_SOFT_LIMIT } from "@/lib/admin/filter";

/** The sticky stacking cards on the home page, in their own order. */
export function KeyProjectsList({
  projects: initial,
}: {
  projects: AdminProject[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.error ?? "Something went wrong."));
      if (res.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Key projects
        </h1>
        <p className="mt-1 text-sm opacity-60">
          These are the large stacking cards on the home page, in this order.
          Mark a project as key with the star on the Projects page.
        </p>
      </div>
      {projects.length > KEY_PROJECT_SOFT_LIMIT && (
        <Notice tone="warning">
          You have {projects.length} key projects. More than{" "}
          {KEY_PROJECT_SOFT_LIMIT} makes the stack long to scroll; consider
          keeping only your strongest work here.
        </Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {projects.length === 0 ? (
        <Notice>
          No key projects yet. Until you add one, the home page skips the
          stacking cards and shows only the grid.
        </Notice>
      ) : (
        <SortableList
          items={projects}
          disabled={pending}
          getLabel={(p) => p.title}
          onReorder={(next) => {
            setProjects(next);
            run(() =>
              reorder(
                "key",
                next.map((p) => p.id),
              ),
            );
          }}
          renderItem={(p, i) => (
            <div className="flex items-center gap-3">
              <span className="hero-heading w-10 text-2xl font-black">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.title}
                </Link>
                {!p.published && (
                  <span className="ml-2 text-xs opacity-60">
                    (draft, not shown yet)
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setProjects((all) => all.filter((x) => x.id !== p.id));
                  run(() => setProjectFlag(p.id, "is_key", false));
                }}
                className="text-xs"
              >
                Remove
              </Button>
            </div>
          )}
        />
      )}
    </div>
  );
}
