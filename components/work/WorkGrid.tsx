"use client";

import { Flip } from "gsap/Flip";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui/Badges";
import { gsap } from "@/lib/gsap";
import { useMotionEnabled } from "@/lib/motion/use-motion";
import type { ProjectStatus } from "@/lib/data/types";
import { ALL, workFilter } from "@/lib/work-filter";

gsap.registerPlugin(Flip);

export const PAGE_SIZE = 12;

/** The slim, serialisable shape the grid needs for each project. */
export type GridProject = {
  id: string;
  title: string;
  shortDesc: string;
  image: string | null;
  typeLabel: string | null;
  status: ProjectStatus;
  showStatusBadge: boolean;
  categorySlugs: string[];
  primaryCategory: { name: string; color: string } | null;
  /** where the card links (the case study from M5; the live site until then) */
  href: string | null;
};

export type GridCategory = { slug: string; name: string };

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function Card({ project }: { project: GridProject }) {
  const body = (
    <>
      {project.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.image}
          alt={`${project.title} preview`}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-[28px] object-cover"
        />
      )}
      <div className="flex flex-col gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          {project.typeLabel && (
            <span className="text-mist text-xs font-light tracking-widest uppercase opacity-60">
              {project.typeLabel}
            </span>
          )}
          {project.showStatusBadge && <StatusBadge status={project.status} />}
        </div>
        <h3 className="text-mist text-lg font-medium uppercase sm:text-xl">
          {project.title}
        </h3>
        {project.shortDesc && (
          <p className="text-mist line-clamp-2 text-sm leading-relaxed font-light opacity-70">
            {project.shortDesc}
          </p>
        )}
        {project.primaryCategory && (
          <span className="text-mist mt-1 inline-flex items-center gap-2 text-xs tracking-wide uppercase opacity-70">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: project.primaryCategory.color }}
            />
            {project.primaryCategory.name}
          </span>
        )}
      </div>
    </>
  );

  const frame =
    "flex h-full flex-col gap-4 rounded-[36px] border border-[#D7E2EA]/25 p-3 pb-5 transition-colors duration-200";
  return project.href ? (
    <a
      href={project.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${frame} hover:border-[#D7E2EA]/70`}
    >
      {body}
    </a>
  ) : (
    <div className={frame}>{body}</div>
  );
}

/**
 * All published projects: a category filter bar and a responsive grid that
 * re-flows with GSAP Flip when the filter changes. Shows 12, then "Load more".
 */
export function WorkGrid({
  projects,
  categories,
}: {
  projects: GridProject[];
  categories: GridCategory[];
}) {
  const gridRef = useRef<HTMLUListElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const motion = useMotionEnabled();
  const [filter, setFilter] = useState(() => workFilter.get());
  const [limit, setLimit] = useState(PAGE_SIZE);

  // a filter that no longer exists (e.g. category removed) falls back to All
  const active =
    filter === ALL || categories.some((c) => c.slug === filter) ? filter : ALL;

  const matching = projects.filter(
    (p) => active === ALL || p.categorySlugs.includes(active),
  );
  const shown = new Set(matching.slice(0, limit).map((p) => p.id));

  const capture = () => {
    if (!motion || !gridRef.current) return;
    flipState.current = Flip.getState(
      gridRef.current.querySelectorAll("[data-project-card]"),
    );
  };

  // filter changes can also come from the "What I do" list
  useEffect(
    () =>
      workFilter.subscribe(() => {
        capture();
        setFilter(workFilter.get());
        setLimit(PAGE_SIZE);
      }),
    // capture reads refs / current motion only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [motion],
  );

  useIsoLayoutEffect(() => {
    const state = flipState.current;
    flipState.current = null;
    if (!state || !motion) return;
    Flip.from(state, {
      duration: 0.5,
      ease: "power2.inOut",
      absolute: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 0.4 },
        ),
      onLeave: (els) =>
        gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.3 }),
    });
  }, [active, limit, motion]);

  const pill = (selected: boolean) =>
    `rounded-full border-2 px-5 py-2 text-xs font-medium tracking-widest uppercase transition-colors duration-200 sm:text-sm ${
      selected
        ? "border-[#D7E2EA] bg-[#D7E2EA] text-[#0C0C0C]"
        : "border-[#D7E2EA]/40 text-[#D7E2EA] hover:border-[#D7E2EA]"
    }`;

  return (
    <div>
      {categories.length > 0 && (
        <div
          role="group"
          aria-label="Filter projects by category"
          className="mb-10 flex flex-wrap justify-center gap-2 sm:mb-14 sm:gap-3"
        >
          {[{ slug: ALL, name: "All" }, ...categories].map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={active === c.slug}
              onClick={() => workFilter.set(c.slug)}
              className={pill(active === c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <ul
        ref={gridRef}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {projects.map((project) => (
          <li
            key={project.id}
            data-project-card={project.id}
            data-flip-id={project.id}
            hidden={!shown.has(project.id)}
          >
            <Card project={project} />
          </li>
        ))}
      </ul>

      {matching.length > limit && (
        <div className="mt-10 flex justify-center sm:mt-14">
          <button
            type="button"
            onClick={() => {
              capture();
              setLimit((n) => n + PAGE_SIZE);
            }}
            className={pill(false)}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
