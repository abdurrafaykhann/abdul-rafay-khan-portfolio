import "server-only";
import { serviceSupabase } from "@/lib/supabase/server";

/**
 * Sliding-window rate limit kept in Postgres (hit_rate_limit). Fails closed:
 * if the database cannot be reached the request is refused, because these
 * limits protect paid AI calls.
 */
export async function allow(
  kind: string,
  visitor: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const db = serviceSupabase();
  if (!db) return false;
  const { data, error } = await db.rpc("hit_rate_limit", {
    p_kind: kind,
    p_visitor: visitor,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit]", error.message);
    return false;
  }
  return data === true;
}
