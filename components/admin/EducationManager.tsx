"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BlurHint, ImageSlot } from "@/components/admin/MediaSlots";
import { SortableList } from "@/components/admin/SortableList";
import {
  Button,
  Field,
  Notice,
  Section,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import { deleteEducation, reorder, saveEducation } from "@/lib/admin/actions";
import type { EducationInput } from "@/lib/admin/schema";

type Entry = Required<Omit<EducationInput, "id">> & { id: string };

const blank = (): Entry => ({
  id: "",
  qualification: "",
  institution: "",
  start: "",
  end: "",
  grade: "",
  description: "",
  photoUrl: "",
  photoAlt: "",
  certificateUrl: "",
  certificateAlt: "",
});

function EntryForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: Entry;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Entry>(k: K, v: Entry[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  // uploads for an unsaved entry go into one temporary folder
  const [folder] = useState(
    () => `education/${initial.id || `new-${Date.now()}`}`,
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#D7E2EA]/25 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Qualification" error={errors.qualification}>
          {(id) => (
            <TextInput
              id={id}
              value={d.qualification}
              onChange={(e) => set("qualification", e.target.value)}
            />
          )}
        </Field>
        <Field label="Institution" error={errors.institution}>
          {(id) => (
            <TextInput
              id={id}
              value={d.institution}
              onChange={(e) => set("institution", e.target.value)}
            />
          )}
        </Field>
        <Field label="From">
          {(id) => (
            <TextInput
              id={id}
              placeholder="e.g. Feb 2023"
              value={d.start}
              onChange={(e) => set("start", e.target.value)}
            />
          )}
        </Field>
        <Field label="To">
          {(id) => (
            <TextInput
              id={id}
              placeholder="e.g. Jan 2026"
              value={d.end}
              onChange={(e) => set("end", e.target.value)}
            />
          )}
        </Field>
        <Field label="Grade">
          {(id) => (
            <TextInput
              id={id}
              placeholder="e.g. CGPA 3.9"
              value={d.grade}
              onChange={(e) => set("grade", e.target.value)}
            />
          )}
        </Field>
      </div>
      <Field label="Description (optional)">
        {(id) => (
          <TextArea
            id={id}
            maxLength={400}
            value={d.description}
            onChange={(e) => set("description", e.target.value)}
          />
        )}
      </Field>
      <p className="text-xs opacity-60">
        The first entry (in this order) that has a photo or certificate is shown
        large at the top of the section.
      </p>
      <BlurHint />
      <p className="text-xs text-amber-200/80">
        For a degree certificate, also blur the QR code and certificate number:
        together they let anyone look up your record.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <ImageSlot
            label="Photo of you (4:5)"
            aspect={4 / 5}
            previewClass="aspect-[4/5]"
            maxWidth={1000}
            folder={folder}
            slot="photo"
            value={d.photoUrl}
            onChange={(v) => set("photoUrl", v)}
          />
          <TextInput
            aria-label="Photo alt text"
            placeholder="Describe the photo (for screen readers)"
            value={d.photoAlt}
            onChange={(e) => set("photoAlt", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <ImageSlot
            label="Degree / certificate"
            maxWidth={1400}
            folder={folder}
            slot="certificate"
            value={d.certificateUrl}
            onChange={(v) => set("certificateUrl", v)}
          />
          <TextInput
            aria-label="Certificate alt text"
            placeholder="Describe the certificate"
            value={d.certificateAlt}
            onChange={(e) => set("certificateAlt", e.target.value)}
          />
        </div>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setErrors({});
              const res = await saveEducation(d);
              if (res.ok) onDone(`Saved “${d.qualification}”.`);
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

export function EducationManager({ entries: initial }: { entries: Entry[] }) {
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
            Education
          </h1>
          <p className="mt-1 text-sm opacity-60">
            Drag to reorder. The numbered rows appear in this order on the site.
          </p>
        </div>
        <Button variant="primary" onClick={() => setEditing("new")}>
          Add entry
        </Button>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {editing === "new" && (
        <Section title="New entry">
          <EntryForm
            initial={blank()}
            onDone={done}
            onCancel={() => setEditing(null)}
          />
        </Section>
      )}
      <SortableList
        items={items}
        disabled={pending || editing !== null}
        getLabel={(e) => e.qualification}
        onReorder={(next) => {
          setItems(next);
          start(async () => {
            const res = await reorder(
              "education",
              next.map((e) => e.id),
            );
            setNotice(
              res.ok
                ? { tone: "success", text: "Order saved." }
                : { tone: "error", text: res.error },
            );
          });
        }}
        renderItem={(e) =>
          editing === e.id ? (
            <EntryForm
              initial={e}
              onDone={done}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{e.qualification}</p>
                <p className="text-xs opacity-55">
                  {[
                    e.institution,
                    [e.start, e.end].filter(Boolean).join(" – "),
                    e.grade,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  {e.photoUrl || e.certificateUrl ? " · has images" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                aria-label={`Edit ${e.qualification}`}
                onClick={() => setEditing(e.id)}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete ${e.qualification}`}
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete “${e.qualification}”?`)) return;
                  start(async () => {
                    const res = await deleteEducation(e.id);
                    if (res.ok) {
                      setItems((all) => all.filter((x) => x.id !== e.id));
                      done(`Deleted “${e.qualification}”.`);
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
