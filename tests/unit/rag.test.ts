import { describe, expect, it, vi } from "vitest";
import { chunkMarkdown } from "@/lib/rag/chunk";
import { buildDocuments, scrubNames } from "@/lib/rag/documents";
import { GeminiEmbedder, assertDim, l2Normalize } from "@/lib/rag/embed";
import { FakeEmbedder } from "@/lib/rag/fake";
import { MemoryStore, retrieveFromMemory, syncIndex } from "@/lib/rag/sync";
import {
  EMPTY_CONTENT,
  type Project,
  type SiteContent,
} from "@/lib/data/types";

const project = (over: Partial<Project> = {}): Project =>
  ({
    id: "p1",
    slug: "sentinel",
    title: "Sentinel",
    typeId: null,
    primaryCategoryId: "c1",
    categoryIds: ["c1"],
    status: "completed",
    showStatusBadge: true,
    published: true,
    shortDesc: "Video surveillance with violence detection.",
    caseStudyMd:
      "## Problem\nCCTV is watched by tired humans.\n\n## Solution\nA classifier flags fights.",
    tech: ["Python", "OpenCV"],
    links: {},
    startedOn: null,
    endedOn: null,
    sort: 0,
    isKey: false,
    keySort: 0,
    showInMarquee: false,
    marqueeSort: 0,
    images: { leftTop: null, leftBottom: null, right: null },
    marqueePoster: null,
    marqueeClip: null,
    architectureSvg: null,
    clientName: null,
    industry: null,
    myRole: null,
    testimonial: null,
    automationTrigger: null,
    apps: [],
    workflowScreenshot: null,
    savingsText: null,
    workflowJsonPath: null,
    productName: null,
    productLogo: null,
    valueProp: null,
    productUrl: null,
    signupUrl: null,
    stage: null,
    pricingModel: null,
    startingPrice: null,
    demoVideo: null,
    features: [],
    galaxy: null,
    metrics: [],
    traction: [],
    changelog: [],
    trainedVsIntegrated: [],
    media: [],
    ...over,
  }) as Project;

const content = (projects: Project[]): SiteContent => ({
  ...EMPTY_CONTENT,
  categories: [
    {
      id: "c1",
      slug: "cv",
      name: "Computer Vision",
      number: "01",
      description: "Models that see.",
      stack: ["PyTorch"],
      color: "#fff",
      showInWhatIDo: true,
      sort: 0,
    },
  ],
  projects,
  site: {
    ...EMPTY_CONTENT.site,
    aboutText: "I build AI products.",
    skills: [{ group: "ML", items: ["PyTorch", "OpenCV"] }],
  },
});

describe("chunkMarkdown", () => {
  it("returns nothing for empty text", () => {
    expect(chunkMarkdown("T", "   ")).toEqual([]);
  });

  it("prefixes every chunk with the title and its section heading", () => {
    const chunks = chunkMarkdown(
      "Sentinel",
      "## Problem\nBad.\n\n## Result\nGood.",
    );
    expect(chunks).toEqual([
      "Sentinel — Problem\nBad.",
      "Sentinel — Result\nGood.",
    ]);
  });

  it("splits long text into overlapping windows no longer than the limit", () => {
    const text = Array.from(
      { length: 80 },
      (_, i) => `Sentence number ${i} is here.`,
    ).join(" ");
    const chunks = chunkMarkdown("Long", text, {
      maxChars: 400,
      overlapChars: 60,
    });
    expect(chunks.length).toBeGreaterThan(3);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(400);
    expect(chunks.every((c) => c.startsWith("Long\n"))).toBe(true);
    // overlap: the end of one chunk reappears at the start of the next
    const tail = chunks[0].slice(-30).trim().split(" ").slice(-2).join(" ");
    expect(chunks[1]).toContain(tail);
  });
});

describe("privacy filtering", () => {
  it("indexes only published projects", () => {
    const docs = buildDocuments(
      content([
        project(),
        project({
          id: "p2",
          slug: "draft",
          title: "Secret Draft",
          published: false,
        }),
      ]),
    );
    const projects = docs.filter((d) => d.sourceType === "project");
    expect(projects.map((d) => d.sourceId)).toEqual(["p1"]);
    expect(JSON.stringify(docs)).not.toContain("Secret Draft");
  });

  it("replaces a hidden client's name, even inside free text", () => {
    const p = project({
      clientName: null,
      industry: "retail",
      shortDesc: "Automation for Acme Bakery orders.",
      caseStudyMd:
        "## Story\nAcme Bakery asked for help. ACME BAKERY loved it.",
    });
    const docs = buildDocuments(content([p]), {
      hiddenClientNames: [{ name: "Acme Bakery", industry: "retail" }],
    });
    const text = JSON.stringify(docs);
    expect(text.toLowerCase()).not.toContain("acme");
    expect(text).toContain("a client in retail");
  });

  it("keeps a shown client name and leaves out private traction", () => {
    const p = project({
      clientName: "Open Co",
      traction: [
        { label: "Users", value: "1200", asOf: "2026-01", showPublic: true },
        { label: "Revenue", value: "SECRET-99", asOf: null, showPublic: false },
      ],
    });
    const text = JSON.stringify(buildDocuments(content([p])));
    expect(text).toContain("Open Co");
    expect(text).toContain("Users: 1200");
    expect(text).not.toContain("SECRET-99");
  });

  it("links project chunks to their case study", () => {
    const doc = buildDocuments(content([project()])).find(
      (d) => d.sourceType === "project",
    )!;
    expect(doc.sourceUrl).toBe("/work/sentinel");
  });

  it("scrubNames ignores empty names", () => {
    expect(scrubNames("hello", [{ name: " ", industry: null }])).toBe("hello");
  });
});

describe("syncIndex", () => {
  it("adds everything first, then only what changed", async () => {
    const store = new MemoryStore();
    const emb = new FakeEmbedder();
    const docs = buildDocuments(content([project()]));

    const first = await syncIndex(store, emb, docs);
    expect(first.added).toBe(first.chunks);
    expect(first.kept).toBe(0);
    const embeddedOnce = emb.calls;

    const second = await syncIndex(store, emb, docs);
    expect(second).toMatchObject({ added: 0, removed: 0, kept: first.chunks });
    expect(emb.calls).toBe(embeddedOnce); // nothing re-embedded

    const edited = buildDocuments(
      content([project({ shortDesc: "Now with weapon detection." })]),
    );
    const third = await syncIndex(store, emb, edited);
    expect(third.added).toBeGreaterThan(0);
    expect(third.removed).toBeGreaterThan(0);
    expect(store.rows.map((r) => r.content).join(" ")).toContain(
      "weapon detection",
    );
    expect(store.rows.map((r) => r.content).join(" ")).not.toContain(
      "violence detection.",
    );
  });

  it("removes the chunks of an unpublished project", async () => {
    const store = new MemoryStore();
    const emb = new FakeEmbedder();
    await syncIndex(store, emb, buildDocuments(content([project()])));
    expect(store.rows.some((r) => r.sourceType === "project")).toBe(true);

    await syncIndex(
      store,
      emb,
      buildDocuments(content([project({ published: false })])),
    );
    expect(store.rows.some((r) => r.sourceType === "project")).toBe(false);
    expect(store.rows.some((r) => r.sourceType === "about")).toBe(true);
  });

  it("force rebuilds every chunk", async () => {
    const store = new MemoryStore();
    const emb = new FakeEmbedder();
    const docs = buildDocuments(content([project()]));
    const a = await syncIndex(store, emb, docs);
    const b = await syncIndex(store, emb, docs, { force: true });
    expect(b.added).toBe(a.chunks);
    expect(b.removed).toBe(a.chunks);
    expect(store.rows).toHaveLength(a.chunks);
  });

  it("keeps the old chunks if embedding fails", async () => {
    const store = new MemoryStore();
    const emb = new FakeEmbedder();
    await syncIndex(store, emb, buildDocuments(content([project()])));
    const before = store.rows.length;
    const broken = {
      embedDocuments: async () => {
        throw new Error("quota");
      },
      embedQuery: async () => [],
    };
    await expect(
      syncIndex(
        store,
        broken,
        buildDocuments(content([project({ shortDesc: "changed" })])),
      ),
    ).rejects.toThrow("quota");
    expect(store.rows).toHaveLength(before);
  });

  it("rejects vectors of the wrong size", async () => {
    const store = new MemoryStore();
    const small = {
      embedDocuments: async (t: string[]) => t.map(() => [1, 0]),
      embedQuery: async () => [1, 0],
    };
    await expect(
      syncIndex(store, small, buildDocuments(content([project()]))),
    ).rejects.toThrow(/768/);
  });
});

describe("retrieval", () => {
  it("finds the relevant project first and applies the threshold", async () => {
    const store = new MemoryStore();
    const emb = new FakeEmbedder();
    const docs = buildDocuments(
      content([
        project(),
        project({
          id: "p2",
          slug: "bakery",
          title: "Sweet Crumbs WhatsApp Agent",
          shortDesc: "WhatsApp ordering agent for a bakery using n8n.",
          caseStudyMd: "",
        }),
      ]),
    );
    await syncIndex(store, emb, docs);

    const hits = await retrieveFromMemory(
      store,
      emb,
      "violence detection in video surveillance",
      { k: 3 },
    );
    expect(hits[0].sourceId).toBe("p1");
    expect(hits[0].sourceUrl).toBe("/work/sentinel");

    const none = await retrieveFromMemory(
      store,
      emb,
      "quantum gardening recipes",
      { threshold: 0.6 },
    );
    expect(none).toEqual([]);
  });
});

describe("embeddings", () => {
  it("normalises vectors and checks the size", () => {
    const v = l2Normalize([3, 4]);
    expect(Math.hypot(...v)).toBeCloseTo(1);
    expect(() => assertDim([1, 2, 3])).toThrow(/768/);
  });

  it("asks Gemini for 768 dimensions with the right task type, and retries a 429", async () => {
    const vec = Array.from({ length: 768 }, (_, i) => (i === 0 ? 2 : 0));
    const calls: { body: string }[] = [];
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      calls.push({ body: String(init?.body) });
      if (calls.length === 1) return new Response("{}", { status: 429 });
      return new Response(JSON.stringify({ embeddings: [{ values: vec }] }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    vi.useFakeTimers();
    const p = new GeminiEmbedder("test-key", fetchImpl).embedQuery("hello");
    await vi.advanceTimersByTimeAsync(1500);
    const out = await p;
    vi.useRealTimers();

    expect(calls).toHaveLength(2);
    const sent = JSON.parse(calls[1].body).requests[0];
    expect(sent.outputDimensionality).toBe(768);
    expect(sent.taskType).toBe("RETRIEVAL_QUERY");
    expect(out).toHaveLength(768);
    expect(Math.hypot(...out)).toBeCloseTo(1);
  });

  it("fails clearly on an API error", async () => {
    const fetchImpl = (async () =>
      new Response("no", { status: 400 })) as unknown as typeof fetch;
    await expect(
      new GeminiEmbedder("k", fetchImpl).embedDocuments(["a"]),
    ).rejects.toThrow(/400/);
  });
});
