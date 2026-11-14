import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { ask, BUSY, type AskEvent } from "@/lib/ask/answer";
import { askEnabled } from "@/lib/ask/availability";
import { scrubPII, MAX_QUESTION_CHARS } from "@/lib/ask/guard";
import { clientIp, visitorHash } from "@/lib/contact";
import { defaultChatModel } from "@/lib/llm";
import { allow } from "@/lib/rate-limit";
import { retrieve } from "@/lib/rag/server";
import { serviceSupabase } from "@/lib/supabase/server";

export const maxDuration = 30;

const Body = z.object({ question: z.string().max(MAX_QUESTION_CHARS * 2) });

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Ask My AI. Streams newline-delimited JSON events (see lib/ask/answer.ts).
 * 10 questions per 10 minutes per visitor and 300 an hour overall.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json({ error: "Not allowed." }, 403);
  }

  const model = askEnabled() ? defaultChatModel() : null;
  if (!model) return json({ error: "unavailable" }, 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: "Invalid request." }, 400);

  const visitor = visitorHash(
    clientIp(request.headers.get("x-forwarded-for")),
    request.headers.get("user-agent"),
  );
  const [mine, overall] = await Promise.all([
    allow("ask", visitor, 10, 600),
    allow("ask-all", "all", 300, 3600),
  ]);
  if (!mine || !overall) {
    return json(
      {
        error:
          "You have asked a lot of questions. Please try again a little later.",
      },
      429,
    );
  }

  const question = parsed.data.question;
  let answered = false;
  let sources = 0;
  let text = "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AskEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        for await (const event of ask({
          question,
          retrieve: (q) => retrieve(q, { k: 6, threshold: 0 }),
          model,
          minSimilarity: Number(process.env.ASK_MIN_SIMILARITY) || 0.55,
        })) {
          if (event.t === "token") text += event.v;
          if (event.t === "done") {
            // the model may itself say the answer is not in the knowledge base
            answered =
              event.answered &&
              !/^that isn['’]t in my knowledge base/i.test(text.trim());
            sources = event.sources;
          }
          send(event);
        }
      } catch {
        send({ t: "error", message: BUSY });
      } finally {
        controller.close();
      }
    },
  });

  after(async () => {
    const db = serviceSupabase();
    if (!db) return;
    const { error } = await db.from("ask_logs").insert({
      question: scrubPII(question),
      answered,
      sources,
      model: answered ? model.used : "none",
    });
    if (error) console.error("[ask log]", error.message);
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
