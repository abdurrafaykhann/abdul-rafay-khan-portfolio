import type { MarqueeItem } from "../marquee";
import type {
  Category,
  EducationEntry,
  Project,
  ProjectStatus,
  ProjectType,
  SiteContent,
} from "./types";

/** Pure helpers that decide what each section shows. No section is ever
 *  rendered empty: every "has…" check below gates a whole section. */

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  live: "Live",
  completed: "Completed",
  in_progress: "In progress",
};

/** Key projects = the sticky stacking cards, in their own order. */
export function keyProjects(content: SiteContent): Project[] {
  return content.projects
    .filter((p) => p.isKey)
    .sort((a, b) => a.keySort - b.keySort);
}

export function whatIDoCategories(content: SiteContent): Category[] {
  return content.categories
    .filter((c) => c.showInWhatIDo)
    .sort((a, b) => a.sort - b.sort);
}

/** All categories a project belongs to (the primary one is always included). */
export function projectCategoryIds(project: Project): string[] {
  const ids = new Set(project.categoryIds);
  if (project.primaryCategoryId) ids.add(project.primaryCategoryId);
  return [...ids];
}

/** Filter-bar categories: only those that actually have a project. */
export function filterCategories(content: SiteContent): Category[] {
  const used = new Set(content.projects.flatMap(projectCategoryIds));
  return content.categories
    .filter((c) => used.has(c.id))
    .sort((a, b) => a.sort - b.sort);
}

export function projectType(
  project: Project,
  types: ProjectType[],
): ProjectType | null {
  return types.find((t) => t.id === project.typeId) ?? null;
}

export function primaryCategory(
  project: Project,
  categories: Category[],
): Category | null {
  return categories.find((c) => c.id === project.primaryCategoryId) ?? null;
}

/** Marquee clips come from projects flagged "show in marquee", in order.
 *  A project with neither a clip nor a poster contributes nothing. */
export function marqueeItems(content: SiteContent): MarqueeItem[] {
  return content.projects
    .filter((p) => p.showInMarquee)
    .sort((a, b) => a.marqueeSort - b.marqueeSort)
    .flatMap((p): MarqueeItem[] => {
      if (p.marqueeClip) {
        return [
          {
            id: p.id,
            type: "video",
            src: p.marqueeClip,
            poster: p.marqueePoster ?? undefined,
            alt: p.title,
          },
        ];
      }
      if (p.marqueePoster) {
        return [
          { id: p.id, type: "image", src: p.marqueePoster, alt: p.title },
        ];
      }
      return [];
    });
}

/** Image for a grid card: the tall one first, then whatever exists. */
export function cardImage(project: Project): string | null {
  return (
    project.images.right ??
    project.images.leftTop ??
    project.images.leftBottom ??
    project.marqueePoster
  );
}

export type Badge = { label: string; value: string; note?: string };

/** Card badges: highlighted metrics, then traction marked "show publicly". */
export function cardBadges(project: Project): Badge[] {
  return [
    ...project.metrics
      .filter((m) => m.highlight)
      .map((m) => ({ label: m.label, value: m.value })),
    ...project.traction
      .filter((t) => t.showPublic)
      .map((t) => ({
        label: t.label,
        value: t.value,
        note: t.asOf ? `as of ${t.asOf}` : undefined,
      })),
  ];
}

export function findProject(
  content: SiteContent,
  slug: string,
): Project | null {
  return content.projects.find((p) => p.slug === slug) ?? null;
}

/** Previous / next project in the Work order (wraps around). */
export function adjacentProjects(
  content: SiteContent,
  slug: string,
): { prev: Project | null; next: Project | null } {
  const list = content.projects;
  const i = list.findIndex((p) => p.slug === slug);
  if (i < 0 || list.length < 2) return { prev: null, next: null };
  return {
    prev: list[(i - 1 + list.length) % list.length],
    next: list[(i + 1) % list.length],
  };
}

/** What the case study page shows: each block only when it has content. */
export function caseStudyBlocks(p: Project) {
  const client = !!(p.clientName || p.industry || p.myRole || p.testimonial);
  const automation = !!(
    p.automationTrigger ||
    p.apps.length ||
    p.workflowScreenshot ||
    p.savingsText ||
    p.workflowJsonPath ||
    p.media.some((m) => m.kind === "dashboard")
  );
  const product = !!(
    p.productName ||
    p.valueProp ||
    p.productUrl ||
    p.signupUrl ||
    p.stage ||
    p.pricingModel ||
    p.features.length ||
    p.changelog.length
  );
  return {
    pitch: !!p.shortDesc,
    demo: !!(p.demoVideo || p.links.video),
    architecture: !!p.architectureSvg,
    metrics: p.metrics.length > 0,
    client,
    automation,
    product,
    trainedVsIntegrated: p.trainedVsIntegrated.length > 0,
    tech: p.tech.length > 0,
    story: p.caseStudyMd.trim().length > 0,
    links: Object.keys(p.links).length > 0,
    gallery: p.media.some((m) => m.kind === "gallery"),
  };
}

export type SectionVisibility = {
  marquee: boolean;
  about: boolean;
  whatIDo: boolean;
  work: boolean;
  /** Education & Skills: shown when there is either */
  education: boolean;
};

export function visibleSections(content: SiteContent): SectionVisibility {
  return {
    marquee: marqueeItems(content).length > 0,
    about: !!content.site.aboutText,
    whatIDo: whatIDoCategories(content).length > 0,
    work: content.projects.length > 0,
    education: content.education.length > 0 || content.site.skills.length > 0,
  };
}

/** The entry whose photos headline the Education section: the first one
 *  (in admin order) that has a photo or a certificate image. */
export function featuredEducation(content: SiteContent): EducationEntry | null {
  return content.education.find((e) => e.photo || e.certificate) ?? null;
}

export type NavLink = { label: string; href: string };

/** Navbar links appear only for sections that are on the page. */
export function navLinks(sections: SectionVisibility): NavLink[] {
  const links: NavLink[] = [];
  if (sections.about) links.push({ label: "About", href: "#about" });
  if (sections.work) links.push({ label: "Work", href: "#work" });
  // "Ask AI" and "Contact" join when those sections ship (M6 / M9).
  return links;
}
