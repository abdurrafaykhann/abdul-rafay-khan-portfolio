"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SortableList } from "@/components/admin/SortableList";
import {
  Button,
  Checkbox,
  Field,
  Notice,
  Section,
  TagInput,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import { deleteCategory, reorder, saveCategory } from "@/lib/admin/actions";
import { slugify, type CategoryInput } from "@/lib/admin/schema";
import type { Category } from "@/lib/data/types";

type Draft = Required<Omit<CategoryInput, "id">> & { id: string };

const blank = (n: number): Draft => ({
  id: "",
  slug: "",
  name: "",
  number: String(n).padStart(2, "0"),
  description: "",
  stack: [],
  color: "#7621B0",
  showInWhatIDo: true,
});

function CategoryForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: Draft;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#D7E2EA]/25 p-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_90px_90px]">
        <Field label="Name" error={errors.name}>
          {(id) => (
            <TextInput
              id={id}
              value={d.name}
              onChange={(e) => {
                const name = e.target.value;
                setD((x) => ({
                  ...x,
                  name,
                  slug: slugTouched ? x.slug : slugify(name),
                }));
              }}
            />
          )}
        </Field>
        <Field label="Slug" error={errors.slug}>
          {(id) => (
            <TextInput
              id={id}
              value={d.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase());
              }}
            />
          )}
        </Field>
        <Field label="Number" error={errors.number}>
          {(id) => (
            <TextInput
              id={id}
              value={d.number}
              onChange={(e) => set("number", e.target.value)}
            />
          )}
        </Field>
        <Field label="Colour" error={errors.color}>
          {(id) => (
            <input
              id={id}
              type="color"
              value={d.color}
              onChange={(e) => set("color", e.target.value)}
              className="h-9 w-full cursor-pointer rounded-xl border border-[#D7E2EA]/25 bg-transparent"
            />
          )}
        </Field>
      </div>
      <Field label="Description" error={errors.description}>
        {(id) => (
          <TextArea
            id={id}
            maxLength={400}
            value={d.description}
            onChange={(e) => set("description", e.target.value)}
          />
        )}
      </Field>
      <Field label="Tech stack" hint="Shown as tags in What I do.">
        {(id) => (
          <TagInput id={id} value={d.stack} onChange={(v) => set("stack", v)} />
        )}
      </Field>
      <Checkbox
        label='Show in "What I do"'
        checked={d.showInWhatIDo}
        onChange={(v) => set("showInWhatIDo", v)}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveCategory(d);
              if (res.ok) onDone(`Saved “${d.name}”.`);
              else {
                setErrors(res.fieldErrors ?? {});
                setError(res.error);
              }
            })
          }
        >
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function CategoriesManager({
  categories: initial,
  usage,
}: {
  categories: Category[];
  /** number of projects per category id */
  usage: Record<string, number>;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [notice, setNotice] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, start] = useTransition();

  const done = (text: string) => {
    setEditing(null);
    setNotice({ tone: "success", text });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">
            Categories
          </h1>
          <p className="mt-1 text-sm opacity-60">
            The &ldquo;What I do&rdquo; list and the Work filters. Drag to
            reorder.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>
          Add category
        </Button>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {editing === "new" && (
        <Section title="New category">
          <CategoryForm
            initial={blank(items.length + 1)}
            onDone={done}
            onCancel={() => setEditing(null)}
          />
        </Section>
      )}
      <SortableList
        items={items}
        disabled={pending || editing !== null}
        getLabel={(c) => c.name}
        onReorder={(next) => {
          setItems(next);
          start(async () => {
            const res = await reorder(
              "categories",
              next.map((c) => c.id),
            );
            setNotice(
              res.ok
                ? { tone: "success", text: "Order saved." }
                : { tone: "error", text: res.error },
            );
          });
        }}
        renderItem={(c) =>
          editing === c.id ? (
            <CategoryForm
              initial={{ ...c, id: c.id }}
              onDone={done}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span
                aria-hidden
                className="size-3 rounded-full"
                style={{ background: c.color }}
              />
              <span className="w-8 font-black opacity-70">{c.number}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs opacity-55">
                  {usage[c.id] ?? 0} project
                  {(usage[c.id] ?? 0) === 1 ? "" : "s"}
                  {c.showInWhatIDo ? "" : " · hidden from What I do"}
                </p>
              </div>
              <Button
                variant="ghost"
                aria-label={`Edit ${c.name}`}
                onClick={() => setEditing(c.id)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete ${c.name}`}
                disabled={pending}
                onClick={() => {
                  if ((usage[c.id] ?? 0) > 0) {
                    setNotice({
                      tone: "error",
                      text: `“${c.name}” is used by ${usage[c.id]} project(s). Move them to another category first.`,
                    });
                    return;
                  }
                  if (!window.confirm(`Delete the category “${c.name}”?`))
                    return;
                  start(async () => {
                    const res = await deleteCategory(c.id);
                    if (res.ok) {
                      setItems((all) => all.filter((x) => x.id !== c.id));
                      done(`Deleted “${c.name}”.`);
                    } else setNotice({ tone: "error", text: res.error });
                  });
                }}
              >
                <Trash2 className="size-4 text-red-300" aria-hidden />
              </Button>
            </div>
          )
        }
      />
    </div>
  );
}
