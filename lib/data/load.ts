import { EMPTY_CONTENT, type SiteContent } from "./types";

/**
 * Where the content shown to a visitor came from:
 *   db        fresh from the database
 *   memory    the last successful load on this server instance
 *   snapshot  the copy captured when the site was last built
 *   empty     nothing available (the site then shows the hero only)
 */
export type ContentSource = "db" | "memory" | "snapshot" | "empty";
export type LoadedContent = { content: SiteContent; source: ContentSource };

type LoadOptions = {
  /** null when the database is not configured (e.g. CI builds) */
  fetcher: (() => Promise<SiteContent>) | null;
  memory: { get(): SiteContent | null; set(content: SiteContent): void };
  snapshot: SiteContent | null;
  timeoutMs?: number;
  onError?: (error: unknown) => void;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Database did not answer within ${ms} ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const hasContent = (c: SiteContent | null): c is SiteContent =>
  !!c && (c.projects.length > 0 || c.categories.length > 0);

/**
 * Loads site content, and never throws: if the database is unreachable
 * (a paused free-tier project, a network blip) it falls back to the newest
 * copy it has instead of taking the site down.
 */
export async function loadContent({
  fetcher,
  memory,
  snapshot,
  timeoutMs = 8000,
  onError,
}: LoadOptions): Promise<LoadedContent> {
  if (fetcher) {
    try {
      const content = await withTimeout(fetcher(), timeoutMs);
      memory.set(content);
      return { content, source: "db" };
    } catch (error) {
      onError?.(error);
    }
  }

  const remembered = memory.get();
  if (remembered) return { content: remembered, source: "memory" };
  if (hasContent(snapshot)) return { content: snapshot, source: "snapshot" };
  return { content: EMPTY_CONTENT, source: "empty" };
}
