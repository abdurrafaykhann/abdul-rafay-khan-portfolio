import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeGalaxy,
  meanVector,
  parseVector,
  type GalaxyItem,
} from "./positions";

const PAGE = 500;

/**
 * Recomputes every published project's galaxy position from its indexed
 * text and stores the ones that changed. Returns how many were updated, so
 * the caller knows whether the public pages need refreshing.
 */
export async function updateGalaxy(db: SupabaseClient): Promise<number> {
  const [projects, categories] = await Promise.all([
    db
      .from("projects")
      .select("id, primary_category_id, galaxy_x, galaxy_y, galaxy_z")
      .eq("published", true),
    db.from("categories").select("id").order("sort"),
  ]);
  if (projects.error) throw new Error(projects.error.message);
  if (categories.error) throw new Error(categories.error.message);
  if (!projects.data?.length) return 0;

  // average each project's chunk vectors into one vector for the project
  const byProject = new Map<string, number[][]>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("kb_chunks")
      .select("source_id, embedding")
      .eq("source_type", "project")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const v = parseVector(r.embedding);
      if (!v) continue;
      const list = byProject.get(r.source_id) ?? [];
      list.push(v);
      byProject.set(r.source_id, list);
    }
    if (!data || data.length < PAGE) break;
  }

  const items: GalaxyItem[] = projects.data.map((p) => ({
    id: p.id,
    categoryId: p.primary_category_id,
    vector: meanVector(byProject.get(p.id) ?? []),
  }));
  const positions = computeGalaxy(
    items,
    (categories.data ?? []).map((c) => c.id),
  );

  let changed = 0;
  for (const p of projects.data) {
    const next = positions.get(p.id);
    if (!next) continue;
    const same =
      Math.abs((p.galaxy_x ?? NaN) - next.x) < 0.001 &&
      Math.abs((p.galaxy_y ?? NaN) - next.y) < 0.001 &&
      Math.abs((p.galaxy_z ?? NaN) - next.z) < 0.001;
    if (same) continue;
    const { error } = await db
      .from("projects")
      .update({ galaxy_x: next.x, galaxy_y: next.y, galaxy_z: next.z })
      .eq("id", p.id);
    if (error) throw new Error(error.message);
    changed++;
  }
  return changed;
}
