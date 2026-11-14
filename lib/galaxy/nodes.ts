import { cardBadges, primaryCategory } from "@/lib/data/select";
import type { SiteContent } from "@/lib/data/types";

/** Everything the 3D view needs for one project (serialisable). */
export type GalaxyNode = {
  id: string;
  title: string;
  href: string;
  color: string;
  category: string | null;
  /** the highlighted metric, e.g. "Recall: 79%" */
  metric: string | null;
  x: number;
  y: number;
  z: number;
};

export type GalaxyLegendItem = { name: string; color: string };

const FALLBACK_COLOR = "#D7E2EA";

/** Published projects that have a stored galaxy position. */
export function galaxyNodes(content: SiteContent): GalaxyNode[] {
  return content.projects
    .filter((p) => p.published && p.galaxy)
    .map((p) => {
      const cat = primaryCategory(p, content.categories);
      const badge = cardBadges(p)[0];
      return {
        id: p.id,
        title: p.title,
        href: `/work/${p.slug}`,
        color: cat?.color || FALLBACK_COLOR,
        category: cat?.name ?? null,
        metric: badge ? `${badge.label}: ${badge.value}` : null,
        x: p.galaxy!.x,
        y: p.galaxy!.y,
        z: p.galaxy!.z,
      };
    });
}

export function galaxyLegend(nodes: GalaxyNode[]): GalaxyLegendItem[] {
  const seen = new Map<string, string>();
  for (const n of nodes)
    if (n.category && !seen.has(n.category)) seen.set(n.category, n.color);
  return [...seen.entries()].map(([name, color]) => ({ name, color }));
}

/** The galaxy toggle only appears when there is something to show. */
export function hasGalaxy(content: SiteContent): boolean {
  return galaxyNodes(content).length > 0;
}
