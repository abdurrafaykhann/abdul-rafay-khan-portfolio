"use client";

import type { ReactNode } from "react";
import { workFilter } from "@/lib/work-filter";

/** Link that jumps to the Work section with a category filter applied. */
export function CategoryFilterLink({
  slug,
  enabled,
  className,
  children,
}: {
  slug: string;
  /** false when there is no Work section to jump to */
  enabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <a
      href="#work"
      onClick={() => workFilter.set(slug)}
      className={className}
      data-category-link={slug}
    >
      {children}
    </a>
  );
}
