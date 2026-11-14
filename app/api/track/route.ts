import type { NextRequest } from "next/server";
import { z } from "zod";
import { clientIp, visitorHash } from "@/lib/contact";
import { allow } from "@/lib/rate-limit";
import { publicSupabase, serviceSupabase } from "@/lib/supabase/server";

const Body = z.object({
  type: z.enum(["view", "click"]),
  projectId: z.uuid(),
  target: z.string().trim().max(200).optional(),
});

const BOT = /bot|crawl|spider|headless|preview|monitor|curl|python-requests/i;

/**
 * Records a page view or link click for a published project. Anonymous:
 * no IP address or user agent is stored, and the database only accepts
 * events for published projects (see migration 0006).
 */
export async function POST(request: NextRequest) {
  // only this site may report events
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return new Response(null, { status: 403 });
  }
  // crawlers are not visitors
  if (BOT.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  // a flood of fake events: 120 per 10 minutes per visitor (when the limiter is available)
  if (serviceSupabase()) {
    const visitor = visitorHash(
      clientIp(request.headers.get("x-forwarded-for")),
      request.headers.get("user-agent"),
    );
    if (!(await allow("track", visitor, 120, 600))) {
      return new Response(null, { status: 204 });
    }
  }

  const client = publicSupabase();
  if (!client) return new Response(null, { status: 204 });
  const { error } = await client.from("events").insert({
    type: parsed.data.type,
    project_id: parsed.data.projectId,
    target: parsed.data.target ?? null,
  });
  if (error) console.error("[track] insert failed:", error.message);
  // never tell the browser anything useful: tracking is best-effort
  return new Response(null, { status: 204 });
}
