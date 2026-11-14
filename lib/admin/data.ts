import "server-only";
import { mapCategory, mapProject, mapProjectType } from "@/lib/data/map";
import type { Category, Project, ProjectType } from "@/lib/data/types";
import { requireAdmin } from "./auth";
import type { ProjectInput } from "./schema";

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
