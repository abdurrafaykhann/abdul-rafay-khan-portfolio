import type { NextRequest } from "next/server";
import { clientIp, ContactSchema, visitorHash } from "@/lib/contact";
import { publicSupabase } from "@/lib/supabase/server";

/**
 * The contact form. Validated here, then stored by the database function
 * submit_message(), which enforces the rate limits (3 per hour per visitor,
 * 60 per hour overall). Nothing personal beyond what the visitor typed is
 * stored: the rate-limit id is a salted hash, never the IP address.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }
  const parsed = ContactSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      },
      { status: 400 },
    );
  }
  // bots fill hidden fields; pretend it worked and store nothing
  if (parsed.data.website) return Response.json({ ok: true });

  const client = publicSupabase();
  if (!client) {
    return Response.json(
      {
        ok: false,
        error:
          "The contact form is unavailable right now. Please email me instead.",
      },
      { status: 503 },
    );
  }
  const visitor = visitorHash(
    clientIp(request.headers.get("x-forwarded-for")),
    request.headers.get("user-agent"),
  );
  const { data, error } = await client.rpc("submit_message", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_body: parsed.data.message,
    p_visitor: visitor,
  });
  if (error) {
    console.error("[contact] failed:", error.message);
    return Response.json(
      { ok: false, error: "Something went wrong. Please email me instead." },
      { status: 500 },
    );
  }
  if (data === "rate_limited") {
    return Response.json(
      {
        ok: false,
        error: "You've sent a few messages already. Please try again later.",
      },
      { status: 429 },
    );
  }
  if (data !== "ok") {
    return Response.json(
      { ok: false, error: "Please check your details." },
      { status: 400 },
    );
  }
  return Response.json({ ok: true });
}
