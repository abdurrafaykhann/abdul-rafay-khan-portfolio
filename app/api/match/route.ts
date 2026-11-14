import type { NextRequest } from "next/server";
import { z } from "zod";
import { askEnabled } from "@/lib/ask/availability";
import { clientIp, visitorHash } from "@/lib/contact";
import { fetchContent } from "@/lib/data/fetch-content";
import { defaultChatModel } from "@/lib/llm";
import { checkJd, runMatch, type Catalog } from "@/lib/match/run";
import { allow } from "@/lib/rate-limit";
import { retrieve } from "@/lib/rag/server";
import { serviceSupabase } from "@/lib/supabase/server";

export const maxDuration = 45;

const Body = z.object({ jd: z.string().max(20000) });

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Job-description matcher. The job description is used for this one request
 * and is never stored; only the structured result is, under a random id.
 * 3 matches an hour per visitor and 60 an hour overall.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json({ error: "Not allowed." }, 403);
  }
  const model = askEnabled() ? defaultChatModel() : null;
  const db = serviceSupabase();
  if (!model || !db) return json({ error: "unavailable" }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const checked = checkJd(parsed.data.jd);
  if (!checked.ok) return json({ error: checked.error }, 400);

  const visitor = visitorHash(
    clientIp(request.headers.get("x-forwarded-for")),
    request.headers.get("user-agent"),
  );
  const [mine, overall] = await Promise.all([
    allow("match", visitor, 3, 3600),
    allow("match-all", "all", 60, 3600),
  ]);
  if (!mine || !overall) {
    return json(
      {
        error:
          "You have used the matcher a few times already. Please try again later.",
      },
      429,
    );
  }

  let catalog: Catalog;
  try {
    const content = await fetchContent(db); // published only
    catalog = {
      projects: content.projects.map((p) => ({
        slug: p.slug,
        title: p.title,
        shortDesc: p.shortDesc,
      })),
      skills: [
        ...new Set([
          ...content.site.skills.flatMap((g) => g.items),
          ...content.projects.flatMap((p) => p.tech),
        ]),
      ],
    };
  } catch {
    return json(
      { error: "The matcher is busy right now. Please try again." },
      503,
    );
  }
  if (catalog.projects.length === 0) {
    return json(
      { error: "There are no published projects to match against yet." },
      503,
    );
  }

  const outcome = await runMatch({
    jd: checked.jd,
    catalog,
    retrieve: (q) => retrieve(q, { k: 8, threshold: 0 }),
    model,
  });
  if (!outcome.ok) return json({ error: outcome.error }, 502);

  const { data, error } = await db
    .from("matches")
    .insert({
      job_title: outcome.result.jobTitle,
      company: outcome.result.company,
      result: outcome.result,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[match store]", error?.message);
    return json({ error: "Couldn't save the result. Please try again." }, 500);
  }
  return json({ id: data.id }, 200);
}
