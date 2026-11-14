export type EventRow = {
  type: "view" | "click";
  project_id: string | null;
  target: string | null;
  created_at: string;
};

export type ProjectRef = { id: string; title: string };

export type Insights = {
  totalViews: number;
  totalClicks: number;
  viewsLast30Days: number;
  perProject: {
    id: string;
    title: string;
    views: number;
    clicks: number;
    views30: number;
  }[];
  /** most clicked links, e.g. "github" / "try-it", with their counts */
  topLinks: { target: string; clicks: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Turns raw events into the numbers the Insights page shows. */
export function summarizeEvents(
  events: EventRow[],
  projects: ProjectRef[],
  now: number = Date.now(),
): Insights {
  const since = now - 30 * DAY_MS;
  const per = new Map(
    projects.map((p) => [
      p.id,
      { id: p.id, title: p.title, views: 0, clicks: 0, views30: 0 },
    ]),
  );
  const links = new Map<string, number>();
  let totalViews = 0;
  let totalClicks = 0;
  let viewsLast30Days = 0;

  for (const e of events) {
    const p = e.project_id ? per.get(e.project_id) : undefined;
    const recent = new Date(e.created_at).getTime() >= since;
    if (e.type === "view") {
      totalViews++;
      if (recent) viewsLast30Days++;
      if (p) {
        p.views++;
        if (recent) p.views30++;
      }
    } else {
      totalClicks++;
      if (p) p.clicks++;
      const target = e.target?.trim() || "other";
      links.set(target, (links.get(target) ?? 0) + 1);
    }
  }

  return {
    totalViews,
    totalClicks,
    viewsLast30Days,
    perProject: [...per.values()].sort(
      (a, b) =>
        b.views - a.views ||
        b.clicks - a.clicks ||
        a.title.localeCompare(b.title),
    ),
    topLinks: [...links.entries()]
      .map(([target, clicks]) => ({ target, clicks }))
      .sort((a, b) => b.clicks - a.clicks || a.target.localeCompare(b.target)),
  };
}
