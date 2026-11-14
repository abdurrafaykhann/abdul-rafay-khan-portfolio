"use client";

import { FileText, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Repeater } from "@/components/admin/Repeater";
import {
  Button,
  Field,
  Notice,
  Section,
  TagInput,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import { saveSiteSettings } from "@/lib/admin/actions";
import type { SiteSettingsInput } from "@/lib/admin/schema";
import { checkPdf, uploadFile } from "@/lib/admin/upload";
import { site } from "@/lib/site";

type Form = Required<Omit<SiteSettingsInput, "skills">> & {
  skills: { group: string; items: string[] }[];
};

export function SiteContentForm({ initial }: { initial: SiteSettingsInput }) {
  const [form, setForm] = useState<Form>({
    heroTagline: initial.heroTagline ?? "",
    aboutText: initial.aboutText ?? "",
    skills: initial.skills ?? [],
    linkedin: initial.linkedin ?? "",
    github: initial.github ?? "",
    email: initial.email ?? "",
    resumeUrl: initial.resumeUrl ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, start] = useTransition();
  const pdf = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveSiteSettings(form);
      if (res.ok) {
        setNotice({ tone: "success", text: "Saved. The site is updated." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setNotice({ tone: "error", text: res.error });
      }
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">
            Site content
          </h1>
          <p className="mt-1 text-sm opacity-60">
            Leave a field empty to hide what depends on it. Nothing is ever
            shown as a placeholder.
          </p>
        </div>
        <Button variant="primary" disabled={saving || uploading} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <Section title="Hero & About">
        <Field
          label="Hero tagline"
          hint={`Empty = “${site.defaultTagline}”`}
          error={errors.heroTagline}
        >
          {(id) => (
            <TextInput
              id={id}
              maxLength={200}
              value={form.heroTagline}
              onChange={(e) => set("heroTagline", e.target.value)}
            />
          )}
        </Field>
        <Field
          label="About text"
          hint="Empty = the About section is hidden."
          error={errors.aboutText}
        >
          {(id) => (
            <TextArea
              id={id}
              maxLength={3000}
              className="min-h-40"
              value={form.aboutText}
              onChange={(e) => set("aboutText", e.target.value)}
            />
          )}
        </Field>
      </Section>

      <Section
        title="Skills"
        description="Grouped as tags in the Education & Skills section."
      >
        <Repeater
          items={form.skills}
          onChange={(v) => set("skills", v)}
          make={() => ({ group: "", items: [] as string[] })}
          addLabel="Add skill group"
          max={12}
          renderRow={(g, update) => (
            <div className="flex flex-col gap-2">
              <TextInput
                aria-label="Group name"
                placeholder="Group, e.g. Backend & APIs"
                value={g.group}
                onChange={(e) => update({ group: e.target.value })}
              />
              <TagInput
                value={g.items}
                onChange={(items) => update({ items })}
                placeholder="Type a skill and press Enter"
              />
            </div>
          )}
        />
        {errors.skills && (
          <p className="text-xs text-red-300">{errors.skills}</p>
        )}
      </Section>

      <Section
        title="Contact & links"
        description="Shown in the Contact section. Empty ones are left out."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Email" error={errors.email}>
            {(id) => (
              <TextInput
                id={id}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            )}
          </Field>
          <Field label="LinkedIn URL" error={errors.linkedin}>
            {(id) => (
              <TextInput
                id={id}
                type="url"
                placeholder="https://"
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
              />
            )}
          </Field>
          <Field label="GitHub URL" error={errors.github}>
            {(id) => (
              <TextInput
                id={id}
                type="url"
                placeholder="https://"
                value={form.github}
                onChange={(e) => set("github", e.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Resume"
        description="A PDF visitors can download from the Contact section."
      >
        {form.resumeUrl ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <FileText className="size-4" aria-hidden />
            <a
              href={form.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Current resume (PDF)
            </a>
            <Button
              variant="ghost"
              className="text-xs"
              disabled={uploading}
              onClick={() => set("resumeUrl", "")}
            >
              <Trash2 className="size-4" aria-hidden /> Remove
            </Button>
          </div>
        ) : (
          <p className="text-sm opacity-60">
            No resume uploaded: the download link is hidden.
          </p>
        )}
        <div>
          <Button
            className="text-xs"
            disabled={uploading}
            onClick={() => pdf.current?.click()}
          >
            {uploading
              ? "Uploading…"
              : form.resumeUrl
                ? "Replace PDF…"
                : "Upload PDF…"}
          </Button>
          <input
            ref={pdf}
            type="file"
            accept="application/pdf"
            hidden
            aria-label="Upload resume PDF"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const problem = checkPdf(file);
              if (problem) return setNotice({ tone: "error", text: problem });
              setUploading(true);
              try {
                set(
                  "resumeUrl",
                  await uploadFile(file, "resume", "resume", "pdf"),
                );
                setNotice({
                  tone: "success",
                  text: "Uploaded. Click “Save changes” to publish it.",
                });
              } catch (err) {
                setNotice({
                  tone: "error",
                  text: err instanceof Error ? err.message : "Upload failed",
                });
              } finally {
                setUploading(false);
              }
            }}
          />
        </div>
        {errors.resumeUrl && (
          <p className="text-xs text-red-300">{errors.resumeUrl}</p>
        )}
      </Section>
    </div>
  );
}
