import { FadeIn } from "@/components/motion/FadeIn";
import { StackingCards } from "@/components/motion/StackingCards";
import { ProjectStackCard } from "@/components/work/ProjectStackCard";
import { WorkGrid, type GridProject } from "@/components/work/WorkGrid";
import {
  cardImage,
  filterCategories,
  keyProjects,
  primaryCategory,
  projectCategoryIds,
  projectType,
} from "@/lib/data/select";
import type { SiteContent } from "@/lib/data/types";

/**
 * "Work": key projects as the template's sticky stacking cards, then every
 * published project in a filterable grid. Render only when there are projects.
 */
export function Work({
  content,
  overlap,
}: {
  content: SiteContent;
  /** true when the white "What I do" section sits directly above */
  overlap: boolean;
}) {
  const keys = keyProjects(content);
  const categories = filterCategories(content);
  const slugOf = new Map(content.categories.map((c) => [c.id, c.slug]));

  const gridProjects: GridProject[] = content.projects.map((p) => {
    const primary = primaryCategory(p, content.categories);
    return {
      id: p.id,
      title: p.title,
      shortDesc: p.shortDesc,
      image: cardImage(p),
      typeLabel: projectType(p, content.types)?.name ?? null,
      status: p.status,
      showStatusBadge: p.showStatusBadge,
      categorySlugs: projectCategoryIds(p)
        .map((id) => slugOf.get(id))
        .filter((s): s is string => !!s),
      primaryCategory: primary
        ? { name: primary.name, color: primary.color }
        : null,
      href: p.links.live ?? null,
    };
  });

  return (
    <section
      id="work"
      className={`bg-ink relative z-10 scroll-mt-4 rounded-t-[40px] px-5 py-20 sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32 ${
        overlap ? "-mt-10 sm:-mt-12 md:-mt-14" : ""
      }`}
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading mb-16 text-center leading-none font-black tracking-tight uppercase sm:mb-20 md:mb-28"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          Work
        </h2>
      </FadeIn>

      {keys.length > 0 && (
        <div className="mx-auto max-w-6xl" data-key-projects>
          <StackingCards>
            {keys.map((project, i) => (
              <ProjectStackCard
                key={project.id}
                project={project}
                index={i}
                typeLabel={projectType(project, content.types)?.name ?? null}
              />
            ))}
          </StackingCards>
        </div>
      )}

      <div
        className={`mx-auto max-w-6xl ${keys.length > 0 ? "mt-16 sm:mt-24" : ""}`}
        data-all-work
      >
        <FadeIn delay={0} y={30}>
          <h3 className="text-mist mb-8 text-center text-sm font-medium tracking-widest uppercase opacity-70 sm:mb-10 sm:text-base">
            All work
          </h3>
        </FadeIn>
        <WorkGrid
          projects={gridProjects}
          categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        />
      </div>
    </section>
  );
}
