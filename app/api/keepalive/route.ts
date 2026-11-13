import type { NextRequest } from "next/server";
import { secretMatches } from "@/lib/secret";
import { publicSupabase } from "@/lib/supabase/server";

/**
 * Daily Vercel cron (see vercel.json). Free Supabase projects pause after a
 * week without activity; one tiny query a day keeps the database awake.
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" on cron requests.
 */
export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!secretMatches(token, process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const client = publicSupabase();
  if (!client) {
    return Response.json(
      { ok: false, reason: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const { error } = await client.from("categories").select("id").limit(1);
  if (error) {
    console.error("[keepalive] query failed:", error.message);
    return Response.json({ ok: false }, { status: 503 });
  }
  return Response.json({ ok: true, at: new Date().toISOString() });
}
