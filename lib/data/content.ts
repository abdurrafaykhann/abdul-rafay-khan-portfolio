import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import { publicSupabase, serviceSupabase } from "@/lib/supabase/server";
import snapshotFile from "./content-snapshot.json";
import { fetchContent } from "./fetch-content";
import { loadContent, type LoadedContent } from "./load";
import type { SiteContent } from "./types";

/** Cache tag for all public content. The admin calls
 *  revalidateTag(CONTENT_TAG, "max") after every save. */
export const CONTENT_TAG = "content";

const snapshot = (snapshotFile as { content: SiteContent | null }).content;

// last good public content on this server instance (never holds drafts)
let lastGood: SiteContent | null = null;
const memory = {
  get: () => lastGood,
  set: (content: SiteContent) => {
    lastGood = content;
  },
};

/**
 * All content for the public site, cached and tagged.
 * - Normal visitors: published content via the anon key; if the database is
 *   down, the last good copy (memory, then the build-time snapshot).
 * - Draft preview (admin only, see /api/draft): everything including drafts,
 *   never cached — Next.js re-runs cached functions while draft mode is on.
 */
export async function getContent(): Promise<LoadedContent> {
  "use cache";
  cacheTag(CONTENT_TAG);

  const { isEnabled: drafts } = await draftMode();
  const client = drafts ? serviceSupabase() : publicSupabase();

  const result = await loadContent({
    fetcher: client
      ? () => fetchContent(client, { includeDrafts: drafts })
      : null,
    // drafts must never be remembered as public fallback content
    memory: drafts ? { get: () => null, set: () => {} } : memory,
    snapshot: drafts ? null : snapshot,
    onError: (error) =>
      console.error("[content] database unavailable, using fallback:", error),
  });

  // Fresh data: re-checked hourly (and on demand when the admin saves).
  // Fallback data: retried every minute until the database is back.
  cacheLife(
    result.source === "db"
      ? { stale: 300, revalidate: 3600, expire: 60 * 60 * 24 * 30 }
      : { stale: 30, revalidate: 60, expire: 3600 },
  );
  return result;
}
