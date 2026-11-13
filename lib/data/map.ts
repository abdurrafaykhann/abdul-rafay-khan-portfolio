import type {
  Category,
  ExperienceEntry,
  Project,
  ProjectLinks,
  ProjectStatus,
  ProjectType,
  SiteSettings,
  Testimonial,
} from "./types";

/** Database rows arrive untyped; these helpers read them defensively. */
type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
/** Empty or whitespace-only text counts as "no value" (and is hidden). */
const text = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v : null;
const bool = (v: unknown): boolean => v === true;
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const rows = (v: unknown): Row[] =>
  Array.isArray(v)
    ? (v as Row[]).filter((x) => x && typeof x === "object")
    : [];
const bySort = (a: Row, b: Row) => num(a.sort) - num(b.sort);

const STATUSES: ProjectStatus[] = ["live", "completed", "in_progress"];

export function mapCategory(r: Row): Category {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    number: str(r.number),
    description: str(r.description),
    stack: list(r.stack),
    color: str(r.color) || "#7621B0",
    showInWhatIDo: bool(r.show_in_what_i_do),
    sort: num(r.sort),
  };
}

export function mapProjectType(r: Row): ProjectType {
  return {
    id: str(r.id),
    slug: str(r.slug),
    name: str(r.name),
    hasClientFields: bool(r.has_client_fields),
    hasAutomationFields: bool(r.has_automation_fields),
    hasProductFields: bool(r.has_product_fields),
    requiresClientApproval: bool(r.requires_client_approval),
    sort: num(r.sort),
  };
}

function mapLinks(v: unknown): ProjectLinks {
  const src = v && typeof v === "object" ? (v as Row) : {};
  const out: ProjectLinks = {};
  for (const key of [
    "live",
    "github",
    "video",
    "huggingface",
    "writeup",
  ] as const) {
    const url = text(src[key]);
    // only http(s) links are ever rendered
    if (url && /^https?:\/\//i.test(url)) out[key] = url;
  }
  return out;
}

function mapTestimonial(v: unknown): Testimonial | null {
  if (!v || typeof v !== "object") return null;
  const src = v as Row;
  const quote = text(src.quote);
  if (!quote) return null;
  return {
    quote,
    name: text(src.name) ?? undefined,
    role: text(src.role) ?? undefined,
    photo: text(src.photo) ?? undefined,
  };
}

export function mapProject(r: Row): Project {
  const status = STATUSES.includes(r.status as ProjectStatus)
    ? (r.status as ProjectStatus)
    : "completed";
  const hasGalaxy =
    typeof r.galaxy_x === "number" &&
    typeof r.galaxy_y === "number" &&
    typeof r.galaxy_z === "number";

  return {
    id: str(r.id),
    slug: str(r.slug),
    title: str(r.title),
    typeId: text(r.type_id),
    primaryCategoryId: text(r.primary_category_id),
    categoryIds: rows(r.project_categories).map((c) => str(c.category_id)),
    status,
    showStatusBadge: bool(r.show_status_badge),
    published: bool(r.published),
    shortDesc: str(r.short_desc),
    caseStudyMd: str(r.case_study_md),
    tech: list(r.tech),
    links: mapLinks(r.links),
    startedOn: text(r.started_on),
    endedOn: text(r.ended_on),

    sort: num(r.sort),
    isKey: bool(r.is_key),
    keySort: num(r.key_sort),
    showInMarquee: bool(r.show_in_marquee),
    marqueeSort: num(r.marquee_sort),

    images: {
      leftTop: text(r.img_left_top),
      leftBottom: text(r.img_left_bottom),
      right: text(r.img_right),
    },
    marqueePoster: text(r.marquee_poster),
    marqueeClip: text(r.marquee_clip),
    architectureSvg: text(r.architecture_svg),

    // client_display_name is already null in the database when hidden
    clientName: text(r.client_display_name),
    industry: text(r.industry),
    myRole: text(r.my_role),
    testimonial: mapTestimonial(r.testimonial),

    automationTrigger: text(r.automation_trigger),
    apps: list(r.apps),
    workflowScreenshot: text(r.workflow_screenshot),
    savingsText: text(r.savings_text),
    workflowJsonPath: text(r.workflow_json_path),

    productName: text(r.product_name),
    productLogo: text(r.product_logo),
    valueProp: text(r.value_prop),
    productUrl: text(r.product_url),
    signupUrl: text(r.signup_url),
    stage: r.stage === "beta" || r.stage === "launched" ? r.stage : null,
    pricingModel:
      r.pricing_model === "free" ||
      r.pricing_model === "freemium" ||
      r.pricing_model === "subscription" ||
      r.pricing_model === "usage_based"
        ? r.pricing_model
        : null,
    startingPrice: text(r.starting_price),
    demoVideo: text(r.demo_video),
    features: list(r.features),

    galaxy: hasGalaxy
      ? {
          x: r.galaxy_x as number,
          y: r.galaxy_y as number,
          z: r.galaxy_z as number,
        }
      : null,

    metrics: rows(r.project_metrics)
      .sort(bySort)
      .map((m) => ({
        label: str(m.label),
        value: str(m.value),
        highlight: bool(m.highlight),
      })),
    traction: rows(r.traction_metrics)
      .sort(bySort)
      .map((t) => ({
        label: str(t.label),
        value: str(t.value),
        asOf: text(t.as_of),
        showPublic: bool(t.show_public),
      })),
    changelog: rows(r.changelog_entries)
      .map((c) => ({ date: str(c.entry_date), note: str(c.note) }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    trainedVsIntegrated: rows(r.trained_vs_integrated)
      .sort(bySort)
      .map((t) => ({
        component: str(t.component),
        kind: t.kind === "trained" ? "trained" : "integrated",
        sourceModel: str(t.source_model),
        evaluation: str(t.evaluation),
      })),
    media: rows(r.project_media)
      .sort(bySort)
      .map((m) => ({
        kind: m.kind === "dashboard" ? "dashboard" : "gallery",
        mediaType: m.media_type === "video" ? "video" : "image",
        url: str(m.url),
        poster: text(m.poster),
        alt: str(m.alt),
      })),
  };
}

export function mapExperience(r: Row): ExperienceEntry {
  return {
    id: str(r.id),
    kind: r.kind === "education" ? "education" : "work",
    org: str(r.org),
    role: str(r.role),
    start: str(r.start_label),
    end: str(r.end_label),
    description: str(r.description),
  };
}

/** site_content is a key → JSON value table. */
export function mapSiteSettings(entries: Row[]): SiteSettings {
  const byKey = new Map(entries.map((e) => [str(e.key), e.value]));
  const socialsRaw = byKey.get("socials");
  const socials =
    socialsRaw && typeof socialsRaw === "object" ? (socialsRaw as Row) : {};
  return {
    heroTagline: text(byKey.get("hero_tagline")),
    aboutText: text(byKey.get("about_text")),
    skills: list(byKey.get("skills")),
    socials: {
      linkedin: text(socials.linkedin) ?? undefined,
      github: text(socials.github) ?? undefined,
      email: text(socials.email) ?? undefined,
    },
    resumeUrl: text(byKey.get("resume_url")),
  };
}
