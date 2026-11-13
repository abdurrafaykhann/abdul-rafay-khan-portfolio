/**
 * Captures the published content into lib/data/content-snapshot.json so the
 * site still has something to show if the database is unreachable and the
 * cache is cold. Runs before `next build` on Vercel (see package.json).
 * Locally it only runs with SNAPSHOT=1, so the committed file stays untouched.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { fetchContent } from "../lib/data/fetch-content";

const OUT = path.join(process.cwd(), "lib", "data", "content-snapshot.json");

async function main() {
  if (!process.env.VERCEL && process.env.SNAPSHOT !== "1") {
    console.log(
      "[snapshot] skipped (not a Vercel build; set SNAPSHOT=1 to force)",
    );
    return;
  }
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("[snapshot] skipped (Supabase is not configured)");
    return;
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const content = await fetchContent(client);
    fs.writeFileSync(
      OUT,
      JSON.stringify(
        { generatedAt: new Date().toISOString(), content },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `[snapshot] saved ${content.projects.length} published project(s)`,
    );
  } catch (error) {
    // never fail the build over the fallback copy
    console.warn("[snapshot] failed, keeping the previous snapshot:", error);
  }
}

main();
