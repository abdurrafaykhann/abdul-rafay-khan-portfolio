"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { BlurHint, ImageSlot, VideoSlot } from "@/components/admin/MediaSlots";
import { MarkdownField } from "@/components/admin/MarkdownField";
import { Repeater } from "@/components/admin/Repeater";
import {
  Button,
  Checkbox,
  Field,
  Notice,
  Section,
  Select,
  TagInput,
  TextArea,
  TextInput,
} from "@/components/admin/ui";
import { ProjectStackCard } from "@/components/work/ProjectStackCard";
import { ProjectGridCard } from "@/components/work/WorkGrid";
import { saveProject } from "@/lib/admin/actions";
import { formToProject, toGridProject } from "@/lib/admin/preview";
import { publishProblems, slugify, type ProjectData } from "@/lib/admin/schema";
import type { Category, ProjectType } from "@/lib/data/types";

export function emptyProject(): ProjectData {
  return {
    id: "",
    slug: "",
    title: "",
    typeId: "",
    primaryCategoryId: "",
    categoryIds: [],
    status: "completed",
    showStatusBadge: true,
    published: false,
    shortDesc: "",
    caseStudyMd: "",
    tech: [],
    links: { live: "", github: "", video: "", huggingface: "", writeup: "" },
    startedOn: "",
    endedOn: "",
    isKey: false,
    showInMarquee: false,
    imgLeftTop: "",
    imgLeftBottom: "",
    imgRight: "",
    marqueePoster: "",
    marqueeClip: "",
    architectureMermaid: "",
    clientName: "",
    hideClientName: false,
    industry: "",
    myRole: "",
    clientApproved: false,
    testimonial: { quote: "", name: "", role: "", photo: "" },
    automationTrigger: "",
    apps: [],
    workflowScreenshot: "",
    savingsText: "",
    productName: "",
    productLogo: "",
    valueProp: "",
    productUrl: "",
    signupUrl: "",
    stage: "",
    pricingModel: "",
    startingPrice: "",
    demoVideo: "",
    features: [],
    metrics: [],
    traction: [],
    changelog: [],
    trainedVsIntegrated: [],
    media: [],
  };
}

export function ProjectEditor({
  initial,
  categories,
  types,
}: {
  initial: ProjectData | null;
  categories: Category[];
  types: ProjectType[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectData>(() => ({
    ...emptyProject(),
    ...initial,
  }));
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [saving, startSaving] = useTransition();
  const [open, setOpen] = useState({
    client: false,
    automation: false,
    product: false,
  });
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(form));
  const dirty = JSON.stringify(form) !== savedJson;
  // uploads for a not-yet-saved project go into one temporary folder
  const [folder] = useState(() =>
    initial?.id ? `projects/${initial.id}` : `projects/new-${Date.now()}`,
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof ProjectData>(key: K, value: ProjectData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const err = (key: string) => errors[key];

  const type = types.find((t) => t.id === form.typeId) ?? null;
  const showClient = !!type?.hasClientFields || open.client;
  const showAutomation = !!type?.hasAutomationFields || open.automation;
  const showProduct = !!type?.hasProductFields || open.product;
  const problems = publishProblems(form, type);

  const preview = useMemo(() => formToProject(form), [form]);
  const gridPreview = useMemo(
    () => toGridProject(preview, categories, types),
    [preview, categories, types],
  );

  const save = (publish?: boolean) =>
    startSaving(async () => {
      const next =
        publish === undefined ? form : { ...form, published: publish };
      if (next.published && problems.length) {
        setNotice({
          tone: "error",
          text: `Can't publish yet: ${problems.join(" ")}`,
        });
        return;
      }
      setErrors({});
      const res = await saveProject(next);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setNotice({ tone: "error", text: res.error });
        return;
      }
      setForm(next);
      setSavedJson(JSON.stringify(next));
      setNotice({
        tone: "success",
        text: next.published
          ? "Saved. Your changes are live on the site."
          : "Saved as a draft (not visible on the site).",
      });
      if (!form.id) router.replace(`/admin/projects/${res.data.id}`);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin/projects"
            className="text-xs opacity-60 hover:opacity-100"
          >
            ← All projects
          </Link>
          <h1 className="text-2xl font-black tracking-tight uppercase">
            {form.id ? form.title || "Untitled project" : "New project"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-200/80">Unsaved changes</span>
          )}
          {form.published && form.links.live && (
            <a
              href={form.links.live}
              target="_blank"
              rel="noreferrer"
              className="text-xs opacity-70 hover:opacity-100"
            >
              <ExternalLink className="inline size-3.5" aria-hidden /> Live
              project
            </a>
          )}
          <Button disabled={saving} onClick={() => save()}>
            {saving ? "Saving…" : form.published ? "Save" : "Save draft"}
          </Button>
          <Button
            variant="primary"
            disabled={saving}
            onClick={() => save(!form.published)}
          >
            {form.published ? "Unpublish" : "Save & publish"}
          </Button>
        </div>
      </div>

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section title="Basics">
            <Field label="Title" error={err("title")}>
              {(id) => (
                <TextInput
                  id={id}
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setForm((f) => ({
                      ...f,
                      title,
                      slug: slugTouched ? f.slug : slugify(title),
                    }));
                  }}
                />
              )}
            </Field>
            <Field
              label="Slug (web address)"
              hint={`/work/${form.slug || "…"}`}
              error={err("slug")}
            >
              {(id) => (
                <TextInput
                  id={id}
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase());
                  }}
                />
              )}
            </Field>
            <Field
              label="Short description"
              hint="One or two sentences for cards."
              error={err("shortDesc")}
            >
              {(id) => (
                <TextArea
                  id={id}
                  maxLength={300}
                  value={form.shortDesc}
                  onChange={(e) => set("shortDesc", e.target.value)}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Status">
                {(id) => (
                  <Select
                    id={id}
                    value={form.status}
                    onChange={(e) =>
                      set("status", e.target.value as ProjectData["status"])
                    }
                  >
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In progress</option>
                  </Select>
                )}
              </Field>
              <Field label="Started" error={err("startedOn")}>
                {(id) => (
                  <TextInput
                    id={id}
                    type="date"
                    value={form.startedOn}
                    onChange={(e) => set("startedOn", e.target.value)}
                  />
                )}
              </Field>
              <Field label="Finished" error={err("endedOn")}>
                {(id) => (
                  <TextInput
                    id={id}
                    type="date"
                    value={form.endedOn}
                    onChange={(e) => set("endedOn", e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Checkbox
              label="Show the status badge on cards"
              checked={form.showStatusBadge}
              onChange={(v) => set("showStatusBadge", v)}
            />
          </Section>

          <Section title="Type & categories">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Project type"
                hint="Decides which extra field groups appear below."
              >
                {(id) => (
                  <Select
                    id={id}
                    value={form.typeId}
                    onChange={(e) => set("typeId", e.target.value)}
                  >
                    <option value="">Choose a type…</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label="Primary category"
                hint="Sets the galaxy cluster and colour."
              >
                {(id) => (
                  <Select
                    id={id}
                    value={form.primaryCategoryId}
                    onChange={(e) => set("primaryCategoryId", e.target.value)}
                  >
                    <option value="">Choose a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-xs font-medium tracking-wider uppercase opacity-70">
                Also appears under
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories
                  .filter((c) => c.id !== form.primaryCategoryId)
                  .map((c) => (
                    <Checkbox
                      key={c.id}
                      label={c.name}
                      checked={form.categoryIds.includes(c.id)}
                      onChange={(v) =>
                        set(
                          "categoryIds",
                          v
                            ? [...form.categoryIds, c.id]
                            : form.categoryIds.filter((x) => x !== c.id),
                        )
                      }
                    />
                  ))}
              </div>
            </fieldset>
          </Section>

          <Section title="Where it appears">
            <Checkbox
              label="Key project (large stacking card on the home page)"
              checked={form.isKey}
              onChange={(v) => set("isKey", v)}
            />
            <Checkbox
              label="Show in the marquee"
              hint="Uses the marquee clip below, or the poster image."
              checked={form.showInMarquee}
              onChange={(v) => set("showInMarquee", v)}
            />
            {!form.published && problems.length > 0 && (
              <Notice tone="info">
                Before publishing: {problems.join(" ")}
              </Notice>
            )}
          </Section>

          <Section
            title="Links"
            description="Empty links are hidden on the site."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["live", "Live project URL"],
                  ["github", "GitHub URL"],
                  ["video", "Video URL"],
                  ["huggingface", "Hugging Face URL"],
                  ["writeup", "Write-up URL"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} error={err(`links.${key}`)}>
                  {(id) => (
                    <TextInput
                      id={id}
                      type="url"
                      placeholder="https://"
                      value={form.links[key]}
                      onChange={(e) =>
                        set("links", { ...form.links, [key]: e.target.value })
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          </Section>

          <Section
            title="Card images"
            description="The key-project card shows two images on the left and one tall image on the right."
          >
            <BlurHint />
            <div className="grid gap-4 sm:grid-cols-3">
              <ImageSlot
                label="Left top"
                aspect={16 / 9}
                previewClass="aspect-video"
                folder={folder}
                slot="left-top"
                value={form.imgLeftTop}
                onChange={(v) => set("imgLeftTop", v)}
              />
              <ImageSlot
                label="Left bottom"
                aspect={4 / 3}
                previewClass="aspect-[4/3]"
                folder={folder}
                slot="left-bottom"
                value={form.imgLeftBottom}
                onChange={(v) => set("imgLeftBottom", v)}
              />
              <ImageSlot
                label="Right (tall)"
                aspect={9 / 8}
                previewClass="aspect-[9/8]"
                folder={folder}
                slot="right"
                value={form.imgRight}
                onChange={(v) => set("imgRight", v)}
              />
            </div>
          </Section>

          <Section
            title="Marquee"
            description="A short muted loop (or a still) for the scrolling rows on the home page."
          >
            <BlurHint />
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageSlot
                label="Poster image"
                aspect={14 / 9}
                previewClass="aspect-[14/9]"
                maxWidth={900}
                folder={folder}
                slot="marquee-poster"
                value={form.marqueePoster}
                onChange={(v) => set("marqueePoster", v)}
              />
              <VideoSlot
                label="Clip (MP4/WebM, max 8 MB)"
                folder={folder}
                slot="marquee-clip"
                value={form.marqueeClip}
                onChange={(v) => set("marqueeClip", v)}
              />
            </div>
          </Section>

          <Section
            title="Results & metrics"
            description="Highlighted metrics appear as badges on cards. Only real, verifiable numbers."
          >
            <Repeater
              items={form.metrics}
              onChange={(v) => set("metrics", v)}
              make={() => ({ label: "", value: "", highlight: false })}
              addLabel="Add metric"
              max={20}
              renderRow={(m, update) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto] sm:items-center">
                  <TextInput
                    aria-label="Metric label"
                    placeholder="Label, e.g. Recall on 400 held-out clips"
                    value={m.label}
                    onChange={(e) => update({ label: e.target.value })}
                  />
                  <TextInput
                    aria-label="Metric value"
                    placeholder="Value, e.g. 79%"
                    value={m.value}
                    onChange={(e) => update({ value: e.target.value })}
                  />
                  <Checkbox
                    label="Highlight"
                    checked={m.highlight}
                    onChange={(v) => update({ highlight: v })}
                  />
                </div>
              )}
            />
          </Section>

          <Section title="Tech stack">
            <Field label="Technologies" hint="Type and press Enter.">
              {(id) => (
                <TagInput
                  id={id}
                  value={form.tech}
                  onChange={(v) => set("tech", v)}
                  placeholder="e.g. Python, LangChain"
                />
              )}
            </Field>
          </Section>

          <Section
            title="Case study"
            description="Markdown. Shown on the project's own page (M5). Raw HTML is stripped."
          >
            <Field label="Case study" error={err("caseStudyMd")}>
              {(id) => (
                <MarkdownField
                  id={id}
                  value={form.caseStudyMd}
                  onChange={(v) => set("caseStudyMd", v)}
                />
              )}
            </Field>
            <Field
              label="Architecture diagram (Mermaid)"
              hint="Rendered to a picture when you save, from milestone M5."
            >
              {(id) => (
                <TextArea
                  id={id}
                  value={form.architectureMermaid}
                  onChange={(e) => set("architectureMermaid", e.target.value)}
                  className="font-mono text-[13px]"
                  placeholder={"flowchart LR\n  User --> API --> Model"}
                />
              )}
            </Field>
          </Section>

          <Section
            title="What I trained vs. what I integrated"
            description="Optional. Be precise: this is what recruiters check."
          >
            <Repeater
              items={form.trainedVsIntegrated}
              onChange={(v) => set("trainedVsIntegrated", v)}
              make={() => ({
                component: "",
                kind: "trained" as const,
                sourceModel: "",
                evaluation: "",
              })}
              addLabel="Add component"
              max={20}
              renderRow={(r, update) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  <TextInput
                    aria-label="Component"
                    placeholder="Component, e.g. Violence classifier"
                    value={r.component}
                    onChange={(e) => update({ component: e.target.value })}
                  />
                  <Select
                    aria-label="Trained or integrated"
                    value={r.kind}
                    onChange={(e) =>
                      update({
                        kind: e.target.value as "trained" | "integrated",
                      })
                    }
                  >
                    <option value="trained">Trained by me</option>
                    <option value="integrated">Integrated (pretrained)</option>
                  </Select>
                  <TextInput
                    aria-label="Model or data"
                    placeholder="Model / data, e.g. Trained on RWF-2000"
                    value={r.sourceModel}
                    onChange={(e) => update({ sourceModel: e.target.value })}
                  />
                  <TextInput
                    aria-label="Evaluation"
                    placeholder="Evaluation, e.g. 79% recall on 400 clips"
                    value={r.evaluation}
                    onChange={(e) => update({ evaluation: e.target.value })}
                  />
                </div>
              )}
            />
          </Section>

          <Section
            title="Gallery & dashboard media"
            description="Extra screenshots or clips for the case study page."
          >
            <BlurHint />
            <Repeater
              items={form.media}
              onChange={(v) => set("media", v)}
              make={() => ({
                kind: "gallery" as const,
                mediaType: "image" as const,
                url: "",
                poster: "",
                alt: "",
              })}
              addLabel="Add image"
              max={40}
              renderRow={(m, update, i) => (
                <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                  <ImageSlot
                    label={`Image ${i + 1}`}
                    folder={folder}
                    slot={`media-${i}`}
                    value={m.url}
                    onChange={(url) => update({ url })}
                    previewClass="aspect-video"
                  />
                  <div className="flex flex-col gap-2">
                    <Select
                      aria-label="Where it shows"
                      value={m.kind}
                      onChange={(e) =>
                        update({
                          kind: e.target.value as "gallery" | "dashboard",
                        })
                      }
                    >
                      <option value="gallery">Gallery</option>
                      <option value="dashboard">Dashboard (automations)</option>
                    </Select>
                    <TextInput
                      aria-label="Alt text"
                      placeholder="Describe the image (for screen readers)"
                      value={m.alt}
                      onChange={(e) => update({ alt: e.target.value })}
                    />
                    {err(`media.${i}.url`) && (
                      <p className="text-xs text-red-300">
                        {err(`media.${i}.url`)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            />
          </Section>

          {showClient ? (
            <Section
              title="Client details"
              description="For client work. A client project can only be published once the client has approved."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client name">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={form.clientName}
                      onChange={(e) => set("clientName", e.target.value)}
                    />
                  )}
                </Field>
                <Field
                  label="Industry"
                  hint={
                    form.hideClientName ? 'Shown as "a client in …"' : undefined
                  }
                >
                  {(id) => (
                    <TextInput
                      id={id}
                      value={form.industry}
                      onChange={(e) => set("industry", e.target.value)}
                    />
                  )}
                </Field>
                <Field label="My role">
                  {(id) => (
                    <TextInput
                      id={id}
                      value={form.myRole}
                      onChange={(e) => set("myRole", e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Checkbox
                label="Hide the client name on the site"
                checked={form.hideClientName}
                onChange={(v) => set("hideClientName", v)}
              />
              <Checkbox
                label="Client approved showing this"
                hint="Required before this project can be published."
                checked={form.clientApproved}
                onChange={(v) => set("clientApproved", v)}
              />
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <div className="flex flex-col gap-3">
                  <Field label="Testimonial quote">
                    {(id) => (
                      <TextArea
                        id={id}
                        value={form.testimonial.quote}
                        onChange={(e) =>
                          set("testimonial", {
                            ...form.testimonial,
                            quote: e.target.value,
                          })
                        }
                      />
                    )}
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput
                      aria-label="Testimonial name"
                      placeholder="Name"
                      value={form.testimonial.name}
                      onChange={(e) =>
                        set("testimonial", {
                          ...form.testimonial,
                          name: e.target.value,
                        })
                      }
                    />
                    <TextInput
                      aria-label="Testimonial role"
                      placeholder="Role"
                      value={form.testimonial.role}
                      onChange={(e) =>
                        set("testimonial", {
                          ...form.testimonial,
                          role: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <ImageSlot
                  label="Photo (optional)"
                  aspect={1}
                  previewClass="aspect-square"
                  maxWidth={400}
                  folder={folder}
                  slot="testimonial"
                  value={form.testimonial.photo}
                  onChange={(photo) =>
                    set("testimonial", { ...form.testimonial, photo })
                  }
                />
              </div>
            </Section>
          ) : (
            <Button
              className="self-start text-xs"
              onClick={() => setOpen((o) => ({ ...o, client: true }))}
            >
              + Add client details
            </Button>
          )}

          {showAutomation ? (
            <Section
              title="Automation details"
              description="For n8n automations. Workflow JSON download (with secrets removed) arrives in M5."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Trigger">
                  {(id) => (
                    <TextInput
                      id={id}
                      placeholder="e.g. New WhatsApp message"
                      value={form.automationTrigger}
                      onChange={(e) => set("automationTrigger", e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Time or money saved">
                  {(id) => (
                    <TextInput
                      id={id}
                      placeholder="e.g. ~6 hours a week"
                      value={form.savingsText}
                      onChange={(e) => set("savingsText", e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Field label="Apps & tools used">
                {(id) => (
                  <TagInput
                    id={id}
                    value={form.apps}
                    onChange={(v) => set("apps", v)}
                    placeholder="e.g. n8n, Google Sheets"
                  />
                )}
              </Field>
              <BlurHint />
              <ImageSlot
                label="Workflow screenshot"
                folder={folder}
                slot="workflow"
                value={form.workflowScreenshot}
                onChange={(v) => set("workflowScreenshot", v)}
                previewClass="aspect-video"
              />
            </Section>
          ) : (
            <Button
              className="self-start text-xs"
              onClick={() => setOpen((o) => ({ ...o, automation: true }))}
            >
              + Add automation details
            </Button>
          )}

          {showProduct ? (
            <Section
              title="Product details"
              description="For SaaS / GaaS products."
            >
              <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Product name">
                    {(id) => (
                      <TextInput
                        id={id}
                        value={form.productName}
                        onChange={(e) => set("productName", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="One-line value proposition">
                    {(id) => (
                      <TextInput
                        id={id}
                        value={form.valueProp}
                        onChange={(e) => set("valueProp", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Product URL" error={err("productUrl")}>
                    {(id) => (
                      <TextInput
                        id={id}
                        type="url"
                        placeholder="https://"
                        value={form.productUrl}
                        onChange={(e) => set("productUrl", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Sign-up / try link" error={err("signupUrl")}>
                    {(id) => (
                      <TextInput
                        id={id}
                        type="url"
                        placeholder="https://"
                        value={form.signupUrl}
                        onChange={(e) => set("signupUrl", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Stage">
                    {(id) => (
                      <Select
                        id={id}
                        value={form.stage}
                        onChange={(e) =>
                          set("stage", e.target.value as ProjectData["stage"])
                        }
                      >
                        <option value="">Not set</option>
                        <option value="beta">Beta</option>
                        <option value="launched">Launched</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Pricing model">
                    {(id) => (
                      <Select
                        id={id}
                        value={form.pricingModel}
                        onChange={(e) =>
                          set(
                            "pricingModel",
                            e.target.value as ProjectData["pricingModel"],
                          )
                        }
                      >
                        <option value="">Not set</option>
                        <option value="free">Free</option>
                        <option value="freemium">Freemium</option>
                        <option value="subscription">Subscription</option>
                        <option value="usage_based">Usage-based</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Starting price (optional)">
                    {(id) => (
                      <TextInput
                        id={id}
                        placeholder="e.g. $9/month"
                        value={form.startingPrice}
                        onChange={(e) => set("startingPrice", e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Demo video URL" error={err("demoVideo")}>
                    {(id) => (
                      <TextInput
                        id={id}
                        type="url"
                        placeholder="https://"
                        value={form.demoVideo}
                        onChange={(e) => set("demoVideo", e.target.value)}
                      />
                    )}
                  </Field>
                </div>
                <ImageSlot
                  label="Logo"
                  aspect={1}
                  previewClass="aspect-square"
                  maxWidth={400}
                  folder={folder}
                  slot="logo"
                  value={form.productLogo}
                  onChange={(v) => set("productLogo", v)}
                />
              </div>
              <Field label="Key features">
                {() => (
                  <Repeater
                    items={form.features.map((text) => ({ text }))}
                    onChange={(rows) =>
                      set(
                        "features",
                        rows.map((r) => r.text),
                      )
                    }
                    make={() => ({ text: "" })}
                    addLabel="Add feature"
                    max={30}
                    renderRow={(r, update) => (
                      <TextInput
                        aria-label="Feature"
                        value={r.text}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    )}
                  />
                )}
              </Field>
              <Field
                label="Traction"
                hint='Badges appear on cards only when "show publicly" is on.'
              >
                {() => (
                  <Repeater
                    items={form.traction}
                    onChange={(v) => set("traction", v)}
                    make={() => ({
                      label: "",
                      value: "",
                      asOf: "",
                      showPublic: false,
                    })}
                    addLabel="Add traction metric"
                    max={20}
                    renderRow={(t, update) => (
                      <div className="grid gap-2 sm:grid-cols-[1fr_110px_150px_auto] sm:items-center">
                        <TextInput
                          aria-label="Traction label"
                          placeholder="e.g. Paying customers"
                          value={t.label}
                          onChange={(e) => update({ label: e.target.value })}
                        />
                        <TextInput
                          aria-label="Traction value"
                          placeholder="Value"
                          value={t.value}
                          onChange={(e) => update({ value: e.target.value })}
                        />
                        <TextInput
                          aria-label="As of date"
                          type="date"
                          value={t.asOf}
                          onChange={(e) => update({ asOf: e.target.value })}
                        />
                        <Checkbox
                          label="Show publicly"
                          checked={t.showPublic}
                          onChange={(v) => update({ showPublic: v })}
                        />
                      </div>
                    )}
                  />
                )}
              </Field>
              <Field label="Changelog">
                {() => (
                  <Repeater
                    items={form.changelog}
                    onChange={(v) => set("changelog", v)}
                    make={() => ({
                      date: new Date().toISOString().slice(0, 10),
                      note: "",
                    })}
                    addLabel="Add changelog entry"
                    renderRow={(c, update) => (
                      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                        <TextInput
                          aria-label="Date"
                          type="date"
                          value={c.date}
                          onChange={(e) => update({ date: e.target.value })}
                        />
                        <TextInput
                          aria-label="Note"
                          placeholder="What changed"
                          value={c.note}
                          onChange={(e) => update({ note: e.target.value })}
                        />
                      </div>
                    )}
                  />
                )}
              </Field>
            </Section>
          ) : (
            <Button
              className="self-start text-xs"
              onClick={() => setOpen((o) => ({ ...o, product: true }))}
            >
              + Add product details
            </Button>
          )}
        </div>

        <aside
          className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start"
          aria-label="Live preview"
        >
          <h2 className="text-xs font-medium tracking-wider uppercase opacity-70">
            Live preview
          </h2>
          <div className="text-mist origin-top-left overflow-hidden rounded-2xl border border-[#D7E2EA]/10 bg-[#0C0C0C] p-2">
            <div
              className="w-[760px] origin-top-left scale-[0.47]"
              style={{ marginBottom: "-53%" }}
            >
              <ProjectStackCard
                project={preview}
                index={0}
                typeLabel={type?.name ?? null}
              />
            </div>
          </div>
          <p className="text-xs opacity-50">
            Key-project card{form.isKey ? "" : " (shown only if marked key)"}
          </p>
          <div className="max-w-[300px]">
            <ProjectGridCard project={gridPreview} />
          </div>
          <p className="text-xs opacity-50">Grid card</p>
        </aside>
      </div>
    </div>
  );
}
