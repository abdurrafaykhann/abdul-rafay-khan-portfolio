"use client";

import { Copy, Pencil, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { SortableList } from "@/components/admin/SortableList";
import { Button, Notice, Select, TextInput } from "@/components/admin/ui";
import {
  deleteProject,
  duplicateProject,
  reorder,
  setProjectFlag,
} from "@/lib/admin/actions";
import type { AdminProject } from "@/lib/admin/data";
import {
  filterProjects,
  isFiltering,
  NO_FILTERS,
  type ProjectFilters,
} from "@/lib/admin/filter";
import { publishProblems } from "@/lib/admin/schema";
import { STATUS_LABELS } from "@/lib/data/select";
import type { Category, ProjectType } from "@/lib/data/types";

export function ProjectsList({
  projects: initial,
  categories,
  types,
}: {
  projects: AdminProject[];
  categories: Category[];
  types: ProjectType[];
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [filters, setFilters] = useState<ProjectFilters>(NO_FILTERS);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const visible = useMemo(
    () => filterProjects(projects, filters),
    [projects, filters],
  );
  const filtering = isFiltering(filters);
  const typeName = (id: string | null) =>
    types.find((t) => t.id === id)?.name ?? "No type";
  const categoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "No category";

  const act = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMessage({ tone: "success", text: success });
        after?.();
        router.refresh();
      } else {
        setMessage({
          tone: "error",
          text: res.error ?? "Something went wrong.",
        });
      }
    });

  const setFlag = (
    p: AdminProject,
    flag: "published" | "is_key",
    value: boolean,
  ) => {
    if (flag === "published" && value) {
      const type = types.find((t) => t.id === p.typeId) ?? null;
      const problems = publishProblems(
        {
          typeId: p.typeId ?? "",
          primaryCategoryId: p.primaryCategoryId ?? "",
          clientApproved: p.clientApproved,
        },
        type,
      );
      if (problems.length) {
        setMessage({
          tone: "error",
          text: `“${p.title}” can't be published yet: ${problems.join(" ")}`,
        });
        return;
      }
    }
    act(
      () => setProjectFlag(p.id, flag, value),
      flag === "published"
        ? value
          ? `Published “${p.title}”. It's live now.`
          : `“${p.title}” is now a draft.`
        : value
          ? `“${p.title}” is now a key project.`
          : `“${p.title}” is no longer a key project.`,
      () =>
        setProjects((all) =>
          all.map((x) =>
            x.id === p.id
              ? { ...x, [flag === "published" ? "published" : "isKey"]: value }
              : x,
          ),
        ),
    );
  };

  const set = <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K],
  ) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Projects
        </h1>
        <Link
          href="/admin/projects/new"
          className="rounded-full bg-[#D7E2EA] px-4 py-2 text-sm font-medium text-[#0C0C0C] hover:bg-white"
        >
          New project
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <TextInput
          aria-label="Search projects"
          placeholder="Search title, slug, tech…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="lg:col-span-2"
        />
        <Select
          aria-label="Filter by category"
          value={filters.categoryId}
          onChange={(e) => set("categoryId", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by type"
          value={filters.typeId}
          onChange={(e) => set("typeId", e.target.value)}
        >
          <option value="">All types</option>
          <option value="none">No type yet</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) =>
            set("status", e.target.value as ProjectFilters["status"])
          }
        >
          <option value="">Any status</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="in_progress">In progress</option>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select
            aria-label="Filter by published"
            value={filters.published}
            onChange={(e) =>
              set("published", e.target.value as ProjectFilters["published"])
            }
          >
            <option value="">Published?</option>
            <option value="yes">Published</option>
            <option value="no">Drafts</option>
          </Select>
          <Select
            aria-label="Filter by key project"
            value={filters.key}
            onChange={(e) =>
              set("key", e.target.value as ProjectFilters["key"])
            }
          >
            <option value="">Key?</option>
            <option value="yes">Key</option>
            <option value="no">Not key</option>
          </Select>
        </div>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {filtering && (
        <p className="text-xs opacity-60">
          Showing {visible.length} of {projects.length}. Clear the filters to
          drag-reorder.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setFilters(NO_FILTERS)}
          >
            Clear filters
          </button>
        </p>
      )}

      {projects.length === 0 ? (
        <Notice>No projects yet. Create your first one.</Notice>
      ) : (
        <SortableList
          items={visible}
          disabled={filtering || pending}
          getLabel={(p) => p.title}
          onReorder={(next) => {
            setProjects(next);
            act(
              () =>
                reorder(
                  "projects",
                  next.map((p) => p.id),
                ),
              "Order saved.",
            );
          }}
          renderItem={(p) => (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] tracking-wider uppercase ${
                      p.published
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-white/10 opacity-70"
                    }`}
                  >
                    {p.published ? "Published" : "Draft"}
                  </span>
                  {p.isKey && (
                    <span className="rounded-full bg-[#B600A8]/20 px-2 py-0.5 text-[0.65rem] tracking-wider text-fuchsia-200 uppercase">
                      Key
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs opacity-55">
                  {typeName(p.typeId)} · {categoryName(p.primaryCategoryId)} ·{" "}
                  {STATUS_LABELS[p.status]} · /{p.slug}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setFlag(p, "published", !p.published)}
                  className="text-xs"
                >
                  {p.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  aria-label={
                    p.isKey
                      ? `Remove ${p.title} from key projects`
                      : `Make ${p.title} a key project`
                  }
                  aria-pressed={p.isKey}
                  onClick={() => setFlag(p, "is_key", !p.isKey)}
                >
                  <Star
                    className={`size-4 ${p.isKey ? "fill-current" : ""}`}
                    aria-hidden
                  />
                </Button>
                <Link
                  href={`/admin/projects/${p.id}`}
                  aria-label={`Edit ${p.title}`}
                  className="rounded-full p-2 opacity-80 hover:opacity-100"
                >
                  <Pencil className="size-4" aria-hidden />
                </Link>
                <Button
                  variant="ghost"
                  disabled={pending}
                  aria-label={`Duplicate ${p.title}`}
                  onClick={() =>
                    act(
                      () => duplicateProject(p.id),
                      `Duplicated “${p.title}” as a draft.`,
                    )
                  }
                >
                  <Copy className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  aria-label={`Delete ${p.title}`}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Delete “${p.title}”? This cannot be undone.`,
                      )
                    )
                      return;
                    act(
                      () => deleteProject(p.id),
                      `Deleted “${p.title}”.`,
                      () =>
                        setProjects((all) => all.filter((x) => x.id !== p.id)),
                    );
                  }}
                >
                  <Trash2 className="size-4 text-red-300" aria-hidden />
                </Button>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
