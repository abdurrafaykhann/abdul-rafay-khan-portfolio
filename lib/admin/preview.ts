import type { GridProject } from "@/components/work/WorkGrid";
import { cardImage } from "@/lib/data/select";
import type { Category, Project, ProjectType } from "@/lib/data/types";
import type { ProjectInput } from "./schema";

const s = (v: string | undefined | null) => (v && v.trim() ? v : null);
const http = (v: string | undefined) =>
  v && /^https?:\/\//i.test(v) ? v : undefined;

/** The editor's form state as the public site would see it (for previews). */
export function formToProject(f: ProjectInput): Project {
  return {
    id: f.id || "preview",
    slug: f.slug,
    title: f.title || "Untitled project",
    typeId: s(f.typeId),
    primaryCategoryId: s(f.primaryCategoryId),
    categoryIds: f.categoryIds ?? [],
    status: f.status,
    showStatusBadge: f.showStatusBadge ?? true,
    published: f.published ?? false,
    shortDesc: f.shortDesc ?? "",
    caseStudyMd: f.caseStudyMd ?? "",
    tech: f.tech ?? [],
    links: {
      live: http(f.links?.live),
      github: http(f.links?.github),
      video: http(f.links?.video),
      huggingface: http(f.links?.huggingface),
      writeup: http(f.links?.writeup),
    },
    startedOn: s(f.startedOn),
    endedOn: s(f.endedOn),
    sort: 0,
    isKey: f.isKey ?? false,
    keySort: 0,
    showInMarquee: f.showInMarquee ?? false,
    marqueeSort: 0,
    images: {
      leftTop: s(f.imgLeftTop),
      leftBottom: s(f.imgLeftBottom),
      right: s(f.imgRight),
    },
    marqueePoster: s(f.marqueePoster),
    marqueeClip: s(f.marqueeClip),
    architectureSvg: null,
    clientName: f.hideClientName ? null : s(f.clientName),
    industry: s(f.industry),
    myRole: s(f.myRole),
    testimonial: f.testimonial?.quote ? { quote: f.testimonial.quote } : null,
    automationTrigger: s(f.automationTrigger),
    apps: f.apps ?? [],
    workflowScreenshot: s(f.workflowScreenshot),
    savingsText: s(f.savingsText),
    workflowJsonPath: null,
    productName: s(f.productName),
    productLogo: s(f.productLogo),
    valueProp: s(f.valueProp),
    productUrl: s(f.productUrl),
    signupUrl: s(f.signupUrl),
    stage: f.stage || null,
    pricingModel: f.pricingModel || null,
    startingPrice: s(f.startingPrice),
    demoVideo: s(f.demoVideo),
    features: f.features ?? [],
    galaxy: null,
    metrics: (f.metrics ?? []).filter((m) => m.label && m.value),
    traction: (f.traction ?? [])
      .filter((t) => t.label && t.value)
      .map((t) => ({
        label: t.label,
        value: t.value,
        asOf: s(t.asOf),
        showPublic: t.showPublic,
      })),
    changelog: [],
    trainedVsIntegrated: [],
    media: [],
  };
}

export function toGridProject(
  p: Project,
  categories: Category[],
  types: ProjectType[],
): GridProject {
  const primary = categories.find((c) => c.id === p.primaryCategoryId) ?? null;
  return {
    id: p.id,
    title: p.title,
    shortDesc: p.shortDesc,
    image: cardImage(p),
    typeLabel: types.find((t) => t.id === p.typeId)?.name ?? null,
    status: p.status,
    showStatusBadge: p.showStatusBadge,
    categorySlugs: [],
    primaryCategory: primary
      ? { name: primary.name, color: primary.color }
      : null,
    href: null,
  };
}
