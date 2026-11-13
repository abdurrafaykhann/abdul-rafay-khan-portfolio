/**
 * The Work grid's active category filter, shared between the "What I do"
 * list (clicking an item filters Work) and the filter bar itself.
 * "all" or a category slug.
 */
export const ALL = "all";

let current = ALL;
const listeners = new Set<() => void>();

export const workFilter = {
  get: () => current,
  set(slug: string) {
    if (slug === current) return;
    current = slug;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
