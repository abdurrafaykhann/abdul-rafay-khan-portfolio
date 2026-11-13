import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const options = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

/**
 * Read-only client using the public (anon) key. Row Level Security limits it
 * to published content. Null when Supabase is not configured.
 */
export function publicSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, options);
}

/**
 * Service-role client: bypasses Row Level Security. Server only — every
 * caller must have verified the admin (or the draft-preview secret) first.
 */
export function serviceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, options);
}
