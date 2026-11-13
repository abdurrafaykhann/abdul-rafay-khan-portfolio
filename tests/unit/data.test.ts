import { describe, expect, it, vi } from "vitest";
import { FIXTURE_CONTENT } from "@/components/dev/fixtures";
import { loadContent } from "@/lib/data/load";
import { mapProject, mapSiteSettings } from "@/lib/data/map";
import {
  cardBadges,
  cardImage,
  filterCategories,
  keyProjects,
  marqueeItems,
  navLinks,
  visibleSections,
  whatIDoCategories,
} from "@/lib/data/select";
import {
  EMPTY_CONTENT,
  type Project,
  type SiteContent,
} from "@/lib/data/types";
import { cardScale, targetScale } from "@/lib/stacking";

const base = FIXTURE_CONTENT.projects[5];
const project = (over: Partial<Project>): Project => ({ ...base, ...over });
const withProjects = (projects: Project[]): SiteContent => ({
  ...FIXTURE_CONTENT,
  projects,
});

describe("mapProject", () => {
  const row = {
    id: "p1",
    slug: "sentinel",
    title: "Sentinel",
    type_id: "t1",
    primary_category_id: "c1",
    status: "completed",
    show_status_badge: true,
    published: true,
    short_desc: "desc",
    tech: ["Python"],
    links: {
      live: "https://example.com",
      github: "javascript:alert(1)",
      video: "  ",
    },
    client_display_name: null,
    industry: "  ",
    is_key: true,
    key_sort: 2,
    project_categories: [{ category_id: "c1" }, { category_id: "c2" }],
    project_metrics: [
      { label: "B", value: "2", highlight: false, sort: 2 },
      { label: "A", value: "1", highlight: true, sort: 1 },
    ],
    traction_metrics: [
      {
        label: "Users",
        value: "9",
        as_of: "2026-01-01",
        show_public: true,
        sort: 1,
      },
    ],
    changelog_entries: [
      { entry_date: "2026-01-01", note: "old" },
      { entry_date: "2026-03-01", note: "new" },
    ],
    trained_vs_integrated: [
      {
        component: "X",
        kind: "trained",
        source_model: "m",
        evaluation: "e",
        sort: 1,
      },
    ],
    project_media: [],
  };

  it("maps columns, sorts child rows and reads relations", () => {
    const p = mapProject(row);
    expect(p.slug).toBe("sentinel");
    expect(p.categoryIds).toEqual(["c1", "c2"]);
    expect(p.metrics.map((m) => m.label)).toEqual(["A", "B"]);
    expect(p.changelog.map((c) => c.note)).toEqual(["new", "old"]);
    expect(p.trainedVsIntegrated[0]).toEqual({
      component: "X",
      kind: "trained",
      sourceModel: "m",
      evaluation: "e",
    });
    expect(p.traction[0]).toMatchObject({
      asOf: "2026-01-01",
      showPublic: true,
    });
  });

  it("treats blank text as missing so empty fields are hidden", () => {
    const p = mapProject(row);
    expect(p.industry).toBeNull();
    expect(p.clientName).toBeNull();
    expect(p.images).toEqual({ leftTop: null, leftBottom: null, right: null });
  });

  it("keeps only http(s) links", () => {
    expect(mapProject(row).links).toEqual({ live: "https://example.com" });
  });

  it("falls back to a valid status and survives a sparse row", () => {
    const p = mapProject({
      id: "x",
      slug: "x",
      title: "X",
      status: "coming_soon",
    });
    expect(p.status).toBe("completed");
    expect(p.metrics).toEqual([]);
    expect(p.galaxy).toBeNull();
  });
});

describe("mapSiteSettings", () => {
  it("reads key/value rows and ignores blanks", () => {
    const s = mapSiteSettings([
      { key: "hero_tagline", value: "my tagline" },
      { key: "about_text", value: "   " },
      { key: "socials", value: { github: "https://github.com/x" } },
      {
        key: "skills",
        value: [
          { group: "Frontend", items: ["React", 3] },
          { group: "Empty", items: [] },
        ],
      },
    ]);
    expect(s.heroTagline).toBe("my tagline");
    expect(s.aboutText).toBeNull();
    expect(s.socials.github).toBe("https://github.com/x");
    expect(s.skills).toEqual([{ group: "Frontend", items: ["React"] }]);
  });
});

describe("section visibility (no empty sections, ever)", () => {
  it("hides everything when there is no content", () => {
    const show = visibleSections(EMPTY_CONTENT);
    expect(show).toEqual({
      marquee: false,
      about: false,
      whatIDo: false,
      work: false,
    });
    expect(navLinks(show)).toEqual([]);
  });

  it("shows sections, and their nav links, only when they have content", () => {
    const show = visibleSections(FIXTURE_CONTENT);
    expect(show).toMatchObject({ about: true, whatIDo: true, work: true });
    expect(show.marquee).toBe(false); // no project is flagged for the marquee
    expect(navLinks(show).map((l) => l.label)).toEqual(["About", "Work"]);
  });
});

describe("selectors", () => {
  it("key projects are ordered by their own order", () => {
    const content = withProjects([
      project({ id: "a", isKey: true, keySort: 2 }),
      project({ id: "b", isKey: false }),
      project({ id: "c", isKey: true, keySort: 1 }),
    ]);
    expect(keyProjects(content).map((p) => p.id)).toEqual(["c", "a"]);
  });

  it("What I do lists only categories with the toggle on", () => {
    const content: SiteContent = {
      ...FIXTURE_CONTENT,
      categories: FIXTURE_CONTENT.categories.map((c, i) => ({
        ...c,
        showInWhatIDo: i !== 1,
      })),
    };
    expect(whatIDoCategories(content).map((c) => c.slug)).toEqual([
      "fixture-0",
      "fixture-2",
      "fixture-3",
    ]);
  });

  it("the filter bar only offers categories that have projects", () => {
    // fixture-3 has no projects
    expect(filterCategories(FIXTURE_CONTENT).map((c) => c.slug)).toEqual([
      "fixture-0",
      "fixture-1",
      "fixture-2",
    ]);
  });

  it("marquee uses flagged projects in order; clip → video, poster → image", () => {
    const content = withProjects([
      project({
        id: "a",
        showInMarquee: true,
        marqueeSort: 2,
        marqueePoster: "/a.webp",
      }),
      project({
        id: "b",
        showInMarquee: true,
        marqueeSort: 1,
        marqueeClip: "/b.webm",
        marqueePoster: "/b.webp",
      }),
      project({ id: "c", showInMarquee: true, marqueeSort: 3 }), // no media: skipped
      project({ id: "d", showInMarquee: false, marqueePoster: "/d.webp" }),
    ]);
    expect(marqueeItems(content)).toEqual([
      {
        id: "b",
        type: "video",
        src: "/b.webm",
        poster: "/b.webp",
        alt: base.title,
      },
      { id: "a", type: "image", src: "/a.webp", alt: base.title },
    ]);
  });

  it("card badges: highlighted metrics and public traction only", () => {
    const p = project({
      metrics: [
        { label: "recall", value: "79%", highlight: true },
        { label: "secret", value: "1", highlight: false },
      ],
      traction: [
        { label: "users", value: "120", asOf: "2026-01-01", showPublic: true },
        { label: "MRR", value: "$900", asOf: null, showPublic: false },
      ],
    });
    expect(cardBadges(p)).toEqual([
      { label: "recall", value: "79%" },
      { label: "users", value: "120", note: "as of 2026-01-01" },
    ]);
  });

  it("card image falls back through the slots, then to none", () => {
    const none = { leftTop: null, leftBottom: null, right: null };
    expect(
      cardImage(project({ images: { ...none, leftTop: "/l.webp" } })),
    ).toBe("/l.webp");
    expect(
      cardImage(project({ images: none, marqueePoster: null })),
    ).toBeNull();
  });
});

describe("loadContent (database fallback)", () => {
  const good = FIXTURE_CONTENT;
  const mem = (initial: SiteContent | null = null) => {
    let value = initial;
    return { get: () => value, set: (c: SiteContent) => void (value = c) };
  };

  it("returns fresh data and remembers it", async () => {
    const memory = mem();
    const res = await loadContent({
      fetcher: async () => good,
      memory,
      snapshot: null,
    });
    expect(res).toEqual({ content: good, source: "db" });
    expect(memory.get()).toBe(good);
  });

  it("database down → last good copy in memory", async () => {
    const onError = vi.fn();
    const res = await loadContent({
      fetcher: async () => {
        throw new Error("project paused");
      },
      memory: mem(good),
      snapshot: null,
      onError,
    });
    expect(res.source).toBe("memory");
    expect(res.content).toBe(good);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("database down and cold memory → build-time snapshot", async () => {
    const res = await loadContent({
      fetcher: async () => {
        throw new Error("down");
      },
      memory: mem(),
      snapshot: good,
    });
    expect(res.source).toBe("snapshot");
  });

  it("nothing available → empty content (hero only), never an error", async () => {
    const res = await loadContent({
      fetcher: null,
      memory: mem(),
      snapshot: null,
    });
    expect(res).toEqual({ content: EMPTY_CONTENT, source: "empty" });
  });

  it("a hanging database times out and falls back", async () => {
    const res = await loadContent({
      fetcher: () => new Promise<SiteContent>(() => {}),
      memory: mem(good),
      snapshot: null,
      timeoutMs: 20,
    });
    expect(res.source).toBe("memory");
  });
});

describe("stacking cards maths (template)", () => {
  it("targetScale = 1 - (total - 1 - index) * 0.03", () => {
    expect(targetScale(0, 3)).toBeCloseTo(0.94);
    expect(targetScale(1, 3)).toBeCloseTo(0.97);
    expect(targetScale(2, 3)).toBe(1);
  });

  it("each card shrinks from its own start point to its target", () => {
    expect(cardScale(0, 0, 3)).toBe(1);
    expect(cardScale(1, 0, 3)).toBeCloseTo(0.94);
    expect(cardScale(0.2, 1, 3)).toBe(1); // card 1 starts at 1/3
    expect(cardScale(1, 1, 3)).toBeCloseTo(0.97);
    expect(cardScale(1, 2, 3)).toBe(1); // last card never shrinks
  });
});
