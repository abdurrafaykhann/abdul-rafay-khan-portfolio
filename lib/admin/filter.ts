import type { ProjectStatus } from "@/lib/data/types";

/** Filters for the admin projects list. */
export type ProjectFilters = {
  search: string;
  categoryId: string; // "" = any
  typeId: string; // "" = any, "none" = no type
  status: "" | ProjectStatus;
  published: "" | "yes" | "no";
  key: "" | "yes" | "no";
};

export const NO_FILTERS: ProjectFilters = {
  search: "",
  categoryId: "",
  typeId: "",
  status: "",
  published: "",
  key: "",
};

type Filterable = {
  title: string;
  slug: string;
  shortDesc: string;
  tech: string[];
  categoryIds: string[];
  primaryCategoryId: string | null;
  typeId: string | null;
  status: ProjectStatus;
  published: boolean;
  isKey: boolean;
};

export function isFiltering(f: ProjectFilters): boolean {
  return Object.entries(f).some(([, v]) => v !== "");
}

export function filterProjects<T extends Filterable>(
  items: T[],
  f: ProjectFilters,
): T[] {
  const q = f.search.trim().toLowerCase();
  return items.filter((p) => {
    if (q) {
      const hay = [p.title, p.slug, p.shortDesc, ...p.tech]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (
      f.categoryId &&
      !p.categoryIds.includes(f.categoryId) &&
      p.primaryCategoryId !== f.categoryId
    ) {
      return false;
    }
    if (
      f.typeId === "none"
        ? p.typeId !== null
        : f.typeId && p.typeId !== f.typeId
    )
      return false;
    if (f.status && p.status !== f.status) return false;
    if (f.published && p.published !== (f.published === "yes")) return false;
    if (f.key && p.isKey !== (f.key === "yes")) return false;
    return true;
  });
}

/** Key projects beyond this many make the stack long; the admin warns. */
export const KEY_PROJECT_SOFT_LIMIT = 6;
