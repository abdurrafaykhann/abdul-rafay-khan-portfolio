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
  TextInput,
} from "@/components/admin/ui";
import { deleteType, reorder, saveType } from "@/lib/admin/actions";
import { slugify, type TypeInput } from "@/lib/admin/schema";
import type { ProjectType } from "@/lib/data/types";

type Draft = Required<Omit<TypeInput, "id">> & { id: string };

const blank = (): Draft => ({
  id: "",
  slug: "",
  name: "",
  hasClientFields: false,
  hasAutomationFields: false,
  hasProductFields: false,
  requiresClientApproval: false,
});

function TypeForm({
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
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-xs font-medium tracking-wider uppercase opacity-70">
          Field groups shown in the editor
        </legend>
        <Checkbox
          label="Client details"
          checked={d.hasClientFields}
          onChange={(v) => set("hasClientFields", v)}
        />
        <Checkbox
          label="Automation details"
          checked={d.hasAutomationFields}
          onChange={(v) => set("hasAutomationFields", v)}
        />
        <Checkbox
          label="Product details"
          checked={d.hasProductFields}
          onChange={(v) => set("hasProductFields", v)}
        />
        <Checkbox
          label="Requires client approval to publish"
          checked={d.requiresClientApproval}
          onChange={(v) => set("requiresClientApproval", v)}
        />
      </fieldset>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveType(d);
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

export function TypesManager({
  types: initial,
  usage,
}: {
  types: ProjectType[];
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
  const flags = (t: ProjectType) =>
    [
      t.hasClientFields && "client fields",
      t.hasAutomationFields && "automation fields",
      t.hasProductFields && "product fields",
      t.requiresClientApproval && "needs client approval",
    ]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">
            Project types
          </h1>
          <p className="mt-1 text-sm opacity-60">
            The label on each card (Client, Personal, …). Any type can be a key
            project.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>
          Add type
        </Button>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {editing === "new" && (
        <Section title="New type">
          <TypeForm
            initial={blank()}
            onDone={done}
            onCancel={() => setEditing(null)}
          />
        </Section>
      )}
      <SortableList
        items={items}
        disabled={pending || editing !== null}
        getLabel={(t) => t.name}
        onReorder={(next) => {
          setItems(next);
          start(async () => {
            const res = await reorder(
              "types",
              next.map((t) => t.id),
            );
            setNotice(
              res.ok
                ? { tone: "success", text: "Order saved." }
                : { tone: "error", text: res.error },
            );
          });
        }}
        renderItem={(t) =>
          editing === t.id ? (
            <TypeForm
              initial={{ ...t, id: t.id }}
              onDone={done}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.name}</p>
                <p className="text-xs opacity-55">
                  {usage[t.id] ?? 0} project
                  {(usage[t.id] ?? 0) === 1 ? "" : "s"}
                  {flags(t) ? ` · ${flags(t)}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                aria-label={`Edit ${t.name}`}
                onClick={() => setEditing(t.id)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete ${t.name}`}
                disabled={pending}
                onClick={() => {
                  if ((usage[t.id] ?? 0) > 0) {
                    setNotice({
                      tone: "error",
                      text: `“${t.name}” is used by ${usage[t.id]} project(s). Change their type first.`,
                    });
                    return;
                  }
                  if (!window.confirm(`Delete the type “${t.name}”?`)) return;
                  start(async () => {
                    const res = await deleteType(t.id);
                    if (res.ok) {
                      setItems((all) => all.filter((x) => x.id !== t.id));
                      done(`Deleted “${t.name}”.`);
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
