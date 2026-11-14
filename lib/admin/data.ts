import "server-only";
import { mapCategory, mapProject, mapProjectType } from "@/lib/data/map";
import type { Category, Project, ProjectType } from "@/lib/data/types";
import { requireAdmin } from "./auth";
import { mapEducation, mapSiteSettings } from "@/lib/data/map";
import { summarizeEvents, type EventRow, type Insights } from "./insights";
import type { EducationInput, ProjectInput, SiteSettingsInput } from "./schema";

/** Admin reads: everything (drafts included), as the signed-in admin. Never cached. */

export type AdminProject = Project & {
  rawClientName: string;
  clientApproved: boolean;
  hideClientName: boolean;
  architectureMermaid: string;
};

const SELECT = `*,
  project_categories(category_id),
  project_metrics(label, value, highlight, sort),
  traction_metrics(label, value, as_of, show_public, sort),
  changelog_entries(entry_date, note),
  trained_vs_integrated(component, kind, source_model, evaluation, sort),
  project_media(kind, media_type, url, poster, alt, sort)`;

function toAdmin(row: Record<string, unknown>): AdminProject {
  return {
    ...mapProject(row),
    rawClientName: typeof row.client_name === "string" ? row.client_name : "",
    clientApproved: row.client_approved === true,
    hideClientName: row.hide_client_name === true,
    architectureMermaid:
      typeof row.architecture_mermaid === "string"
        ? row.architecture_mermaid
        : "",
  };
}

export async function adminLists(): Promise<{
  projects: AdminProject[];
  categories: Category[];
  types: ProjectType[];
}> {
  const { supabase } = await requireAdmin();
  const [p, c, t] = await Promise.all([
    supabase.from("projects").select(SELECT).order("sort"),
    supabase.from("categories").select("*").order("sort"),
    supabase.from("project_types").select("*").order("sort"),
  ]);
  for (const r of [p, c, t]) if (r.error) throw new Error(r.error.message);
  return {
    projects: (p.data ?? []).map(toAdmin),
    categories: (c.data ?? []).map(mapCategory),
    types: (t.data ?? []).map(mapProjectType),
  };
}

export async function adminProject(id: string): Promise<AdminProject | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toAdmin(data) : null;
}

/** Editor form state for an existing project. */
export function projectToInput(p: AdminProject): ProjectInput {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    typeId: p.typeId ?? "",
    primaryCategoryId: p.primaryCategoryId ?? "",
    categoryIds: p.categoryIds.filter((c) => c !== p.primaryCategoryId),
    status: p.status,
    showStatusBadge: p.showStatusBadge,
    published: p.published,
    shortDesc: p.shortDesc,
    caseStudyMd: p.caseStudyMd,
    tech: p.tech,
    links: {
      live: p.links.live ?? "",
      github: p.links.github ?? "",
      video: p.links.video ?? "",
      huggingface: p.links.huggingface ?? "",
      writeup: p.links.writeup ?? "",
    },
    startedOn: p.startedOn ?? "",
    endedOn: p.endedOn ?? "",
    isKey: p.isKey,
    showInMarquee: p.showInMarquee,
    imgLeftTop: p.images.leftTop ?? "",
    imgLeftBottom: p.images.leftBottom ?? "",
    imgRight: p.images.right ?? "",
    marqueePoster: p.marqueePoster ?? "",
    marqueeClip: p.marqueeClip ?? "",
    architectureMermaid: p.architectureMermaid,
    architectureSvg: p.architectureSvg ?? "",
    clientName: p.rawClientName,
    hideClientName: p.hideClientName,
    industry: p.industry ?? "",
    myRole: p.myRole ?? "",
    clientApproved: p.clientApproved,
    testimonial: {
      quote: p.testimonial?.quote ?? "",
      name: p.testimonial?.name ?? "",
      role: p.testimonial?.role ?? "",
      photo: p.testimonial?.photo ?? "",
    },
    automationTrigger: p.automationTrigger ?? "",
    apps: p.apps,
    workflowScreenshot: p.workflowScreenshot ?? "",
    savingsText: p.savingsText ?? "",
    productName: p.productName ?? "",
    productLogo: p.productLogo ?? "",
    valueProp: p.valueProp ?? "",
    productUrl: p.productUrl ?? "",
    signupUrl: p.signupUrl ?? "",
    stage: p.stage ?? "",
    pricingModel: p.pricingModel ?? "",
    startingPrice: p.startingPrice ?? "",
    demoVideo: p.demoVideo ?? "",
    features: p.features,
    metrics: p.metrics,
    traction: p.traction.map((t) => ({
      label: t.label,
      value: t.value,
      asOf: t.asOf ?? "",
      showPublic: t.showPublic,
    })),
    changelog: [...p.changelog]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((c) => ({ date: c.date, note: c.note })),
    trainedVsIntegrated: p.trainedVsIntegrated,
    media: p.media.map((m) => ({
      kind: m.kind,
      mediaType: m.mediaType,
      url: m.url,
      poster: m.poster ?? "",
      alt: m.alt,
    })),
  };
}

// ── Site content, education, messages, insights ───────────────────────

export async function adminSite(): Promise<{
  settings: SiteSettingsInput;
  education: (EducationInput & { id: string })[];
}> {
  const { supabase } = await requireAdmin();
  const [site, edu] = await Promise.all([
    supabase.from("site_content").select("key, value"),
    supabase.from("education").select("*").order("sort"),
  ]);
  for (const r of [site, edu]) if (r.error) throw new Error(r.error.message);
  const s = mapSiteSettings(site.data ?? []);
  return {
    settings: {
      heroTagline: s.heroTagline ?? "",
      aboutText: s.aboutText ?? "",
      skills: s.skills,
      linkedin: s.socials.linkedin ?? "",
      github: s.socials.github ?? "",
      email: s.socials.email ?? "",
      resumeUrl: s.resumeUrl ?? "",
    },
    education: (edu.data ?? []).map((row) => {
      const e = mapEducation(row);
      return {
        id: e.id,
        qualification: e.qualification,
        institution: e.institution,
        start: e.start,
        end: e.end,
        grade: e.grade,
        description: e.description,
        photoUrl: e.photo?.url ?? "",
        photoAlt: e.photo?.alt ?? "",
        certificateUrl: e.certificate?.url ?? "",
        certificateAlt: e.certificate?.alt ?? "",
      };
    }),
  };
}

export type AdminMessage = {
  id: string;
  name: string;
  email: string;
  body: string;
  status: "new" | "read" | "archived";
  createdAt: string;
};

export async function adminMessages(): Promise<AdminMessage[]> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("id, name, email, body, status, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    email: m.email as string,
    body: m.body as string,
    status: m.status as AdminMessage["status"],
    createdAt: m.created_at as string,
  }));
}

/** Number of unread messages (for the nav badge). */
export async function unreadMessageCount(): Promise<number> {
  const { supabase } = await requireAdmin();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export async function adminInsights(): Promise<Insights> {
  const { supabase } = await requireAdmin();
  const [events, projects] = await Promise.all([
    supabase
      .from("events")
      .select("type, project_id, target, created_at")
      .order("created_at", { ascending: false })
      .limit(20000),
    supabase.from("projects").select("id, title"),
  ]);
  for (const r of [events, projects])
    if (r.error) throw new Error(r.error.message);
  return summarizeEvents(
    (events.data ?? []) as EventRow[],
    (projects.data ?? []) as { id: string; title: string }[],
  );
}

export type AskLogEntry = {
  id: string;
  question: string;
  answered: boolean;
  model: string | null;
  createdAt: string;
};

export type AiActivity = {
  asked: number;
  unanswered: number;
  recentQuestions: AskLogEntry[];
  matched: number;
  recentMatches: {
    id: string;
    jobTitle: string | null;
    company: string | null;
    createdAt: string;
  }[];
};

/** Questions asked of the AI and job descriptions matched (titles only). */
export async function adminAiActivity(): Promise<AiActivity> {
  const { supabase } = await requireAdmin();
  const [asks, matches, askCount, unansweredCount, matchCount] =
    await Promise.all([
      supabase
        .from("ask_logs")
        .select("id, question, answered, model, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("matches")
        .select("id, job_title, company, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("ask_logs").select("id", { count: "exact", head: true }),
      supabase
        .from("ask_logs")
        .select("id", { count: "exact", head: true })
        .eq("answered", false),
      supabase.from("matches").select("id", { count: "exact", head: true }),
    ]);
  for (const r of [asks, matches, askCount, unansweredCount, matchCount])
    if (r.error) throw new Error(r.error.message);
  return {
    asked: askCount.count ?? 0,
    unanswered: unansweredCount.count ?? 0,
    recentQuestions: (asks.data ?? []).map((r) => ({
      id: r.id,
      question: r.question,
      answered: r.answered,
      model: r.model,
      createdAt: r.created_at,
    })),
    matched: matchCount.count ?? 0,
    recentMatches: (matches.data ?? []).map((r) => ({
      id: r.id,
      jobTitle: r.job_title,
      company: r.company,
      createdAt: r.created_at,
    })),
  };
}
