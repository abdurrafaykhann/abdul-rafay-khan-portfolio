import { z } from "zod";

/** Validation for everything the admin can save. Runs on the server in every
 *  Server Action (the browser form is never trusted). */

const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).default("");
const id = z.uuid();
const optId = z.union([z.uuid(), z.literal("")]).default("");

/** A link shown to visitors: http(s) only. */
const webUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => v === "" || /^https?:\/\/\S+$/i.test(v),
    "Must start with http:// or https://",
  );

/** An uploaded file or a site path: https URL or a path starting with "/". */
const mediaUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => v === "" || /^(https:\/\/\S+|\/[^\s/]\S*)$/i.test(v),
    "Not a valid file URL",
  );

const date = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD")
  .default("");

const tags = z.array(text(60).min(1)).max(40).default([]);

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProjectSchema = z.object({
  id: optId,
  slug: text(80).regex(SLUG_RE, "Lowercase letters, numbers and dashes only"),
  title: text(120).min(1, "Title is required"),
  typeId: optId,
  primaryCategoryId: optId,
  categoryIds: z.array(id).max(30).default([]),
  status: z.enum(["live", "completed", "in_progress"]),
  showStatusBadge: z.boolean().default(true),
  published: z.boolean().default(false),
  shortDesc: optText(300),
  caseStudyMd: optText(50_000),
  tech: tags,
  links: z
    .object({
      live: webUrl.default(""),
      github: webUrl.default(""),
      video: webUrl.default(""),
      huggingface: webUrl.default(""),
      writeup: webUrl.default(""),
    })
    .default({ live: "", github: "", video: "", huggingface: "", writeup: "" }),
  startedOn: date,
  endedOn: date,
  isKey: z.boolean().default(false),
  showInMarquee: z.boolean().default(false),

  imgLeftTop: mediaUrl.default(""),
  imgLeftBottom: mediaUrl.default(""),
  imgRight: mediaUrl.default(""),
  marqueePoster: mediaUrl.default(""),
  marqueeClip: mediaUrl.default(""),
  architectureMermaid: optText(20_000),

  clientName: optText(120),
  hideClientName: z.boolean().default(false),
  industry: optText(80),
  myRole: optText(120),
  clientApproved: z.boolean().default(false),
  testimonial: z
    .object({
      quote: optText(1000),
      name: optText(120),
      role: optText(120),
      photo: mediaUrl.default(""),
    })
    .default({ quote: "", name: "", role: "", photo: "" }),

  automationTrigger: optText(200),
  apps: tags,
  workflowScreenshot: mediaUrl.default(""),
  savingsText: optText(200),

  productName: optText(120),
  productLogo: mediaUrl.default(""),
  valueProp: optText(200),
  productUrl: webUrl.default(""),
  signupUrl: webUrl.default(""),
  stage: z.enum(["", "beta", "launched"]).default(""),
  pricingModel: z
    .enum(["", "free", "freemium", "subscription", "usage_based"])
    .default(""),
  startingPrice: optText(60),
  demoVideo: webUrl.default(""),
  features: z.array(text(200).min(1)).max(30).default([]),

  metrics: z
    .array(
      z.object({
        label: text(80).min(1),
        value: text(40).min(1),
        highlight: z.boolean(),
      }),
    )
    .max(20)
    .default([]),
  traction: z
    .array(
      z.object({
        label: text(80).min(1),
        value: text(40).min(1),
        asOf: date,
        showPublic: z.boolean(),
      }),
    )
    .max(20)
    .default([]),
  changelog: z
    .array(
      z.object({
        date: text(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
        note: text(300).min(1),
      }),
    )
    .max(50)
    .default([]),
  trainedVsIntegrated: z
    .array(
      z.object({
        component: text(120).min(1),
        kind: z.enum(["trained", "integrated"]),
        sourceModel: optText(200),
        evaluation: optText(200),
      }),
    )
    .max(20)
    .default([]),
  media: z
    .array(
      z.object({
        kind: z.enum(["gallery", "dashboard"]),
        mediaType: z.enum(["image", "video"]),
        url: mediaUrl.refine((v) => v !== "", "File is required"),
        poster: mediaUrl.default(""),
        alt: optText(200),
      }),
    )
    .max(40)
    .default([]),
});

export type ProjectInput = z.input<typeof ProjectSchema>;
export type ProjectData = z.output<typeof ProjectSchema>;

/** Why a project cannot be published yet (mirrors the database rule). */
export function publishProblems(
  p: Pick<ProjectData, "typeId" | "primaryCategoryId" | "clientApproved">,
  type: { requiresClientApproval: boolean } | null,
): string[] {
  const problems: string[] = [];
  if (!p.typeId) problems.push("Choose a project type.");
  if (!p.primaryCategoryId) problems.push("Choose a primary category.");
  if (type?.requiresClientApproval && !p.clientApproved) {
    problems.push('Tick "Client approved showing this" first.');
  }
  return problems;
}

/** The JSON the save_project() database function expects. */
export function toDbPayload(p: ProjectData) {
  const testimonial = p.testimonial.quote
    ? {
        quote: p.testimonial.quote,
        name: p.testimonial.name || undefined,
        role: p.testimonial.role || undefined,
        photo: p.testimonial.photo || undefined,
      }
    : null;
  const links = Object.fromEntries(
    Object.entries(p.links).filter(([, v]) => v),
  );
  return {
    id: p.id || null,
    slug: p.slug,
    title: p.title,
    type_id: p.typeId,
    primary_category_id: p.primaryCategoryId,
    category_ids: p.categoryIds,
    status: p.status,
    show_status_badge: p.showStatusBadge,
    published: p.published,
    short_desc: p.shortDesc,
    case_study_md: p.caseStudyMd,
    tech: p.tech,
    links,
    started_on: p.startedOn,
    ended_on: p.endedOn,
    is_key: p.isKey,
    show_in_marquee: p.showInMarquee,
    img_left_top: p.imgLeftTop,
    img_left_bottom: p.imgLeftBottom,
    img_right: p.imgRight,
    marquee_poster: p.marqueePoster,
    marquee_clip: p.marqueeClip,
    architecture_mermaid: p.architectureMermaid,
    client_name: p.clientName,
    hide_client_name: p.hideClientName,
    industry: p.industry,
    my_role: p.myRole,
    client_approved: p.clientApproved,
    testimonial,
    automation_trigger: p.automationTrigger,
    apps: p.apps,
    workflow_screenshot: p.workflowScreenshot,
    savings_text: p.savingsText,
    product_name: p.productName,
    product_logo: p.productLogo,
    value_prop: p.valueProp,
    product_url: p.productUrl,
    signup_url: p.signupUrl,
    stage: p.stage,
    pricing_model: p.pricingModel,
    starting_price: p.startingPrice,
    demo_video: p.demoVideo,
    features: p.features,
    metrics: p.metrics,
    traction: p.traction.map((t) => ({
      label: t.label,
      value: t.value,
      as_of: t.asOf,
      show_public: t.showPublic,
    })),
    changelog: p.changelog.map((c) => ({ entry_date: c.date, note: c.note })),
    trained_vs_integrated: p.trainedVsIntegrated.map((t) => ({
      component: t.component,
      kind: t.kind,
      source_model: t.sourceModel,
      evaluation: t.evaluation,
    })),
    media: p.media.map((m) => ({
      kind: m.kind,
      media_type: m.mediaType,
      url: m.url,
      poster: m.poster,
      alt: m.alt,
    })),
  };
}

export const CategorySchema = z.object({
  id: optId,
  slug: text(60).regex(SLUG_RE, "Lowercase letters, numbers and dashes only"),
  name: text(80).min(1, "Name is required"),
  number: optText(6),
  description: optText(400),
  stack: tags,
  color: text(7).regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #7621B0"),
  showInWhatIDo: z.boolean().default(true),
});
export type CategoryInput = z.input<typeof CategorySchema>;

export const TypeSchema = z.object({
  id: optId,
  slug: text(60).regex(SLUG_RE, "Lowercase letters, numbers and dashes only"),
  name: text(60).min(1, "Name is required"),
  hasClientFields: z.boolean().default(false),
  hasAutomationFields: z.boolean().default(false),
  hasProductFields: z.boolean().default(false),
  requiresClientApproval: z.boolean().default(false),
});
export type TypeInput = z.input<typeof TypeSchema>;

export const ReorderSchema = z.object({
  list: z.enum(["projects", "key", "marquee", "categories", "types"]),
  ids: z.array(id).max(500),
});

/** "My Cool Project!" → "my-cool-project" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
