import { FadeIn } from "@/components/motion/FadeIn";
import { CategoryFilterLink } from "@/components/work/CategoryFilterLink";
import type { Category } from "@/lib/data/types";

/**
 * "What I do" — the template's white Services section, driven by the
 * categories marked "show in What I do". Clicking an item jumps to Work
 * filtered to that category (when that category has projects).
 */
export function WhatIDo({
  categories,
  linkableSlugs,
}: {
  categories: Category[];
  /** categories that have at least one project in the Work section */
  linkableSlugs: string[];
}) {
  return (
    <section
      id="what-i-do"
      className="rounded-t-[40px] bg-white px-5 py-20 text-[#0C0C0C] sm:rounded-t-[50px] sm:px-8 sm:py-24 md:rounded-t-[60px] md:px-10 md:py-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="mb-16 text-center leading-none font-black tracking-tight uppercase sm:mb-20 md:mb-28"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          What I do
        </h2>
      </FadeIn>

      <ul className="mx-auto max-w-5xl">
        {categories.map((category, i) => (
          <FadeIn
            as="li"
            key={category.id}
            delay={i * 0.1}
            className="border-t border-[rgba(12,12,12,0.15)] last:border-b"
          >
            <CategoryFilterLink
              slug={category.slug}
              enabled={linkableSlugs.includes(category.slug)}
              className="group flex items-center gap-6 py-8 sm:gap-10 sm:py-10 md:gap-14 md:py-12"
            >
              <span
                className="leading-none font-black"
                style={{ fontSize: "clamp(3rem, 10vw, 140px)" }}
              >
                {category.number}
              </span>
              <span className="flex flex-col gap-2 sm:gap-3">
                <span
                  className="font-medium uppercase underline-offset-4 group-hover:underline"
                  style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                >
                  {category.name}
                </span>
                {category.description && (
                  <span
                    className="max-w-2xl leading-relaxed font-light opacity-60"
                    style={{ fontSize: "clamp(0.85rem, 1.6vw, 1.25rem)" }}
                  >
                    {category.description}
                  </span>
                )}
                {category.stack.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-2">
                    {category.stack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-full border border-[rgba(12,12,12,0.25)] px-3 py-1 text-xs font-medium tracking-wide uppercase sm:text-sm"
                      >
                        {tech}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </CategoryFilterLink>
          </FadeIn>
        ))}
      </ul>
    </section>
  );
}
