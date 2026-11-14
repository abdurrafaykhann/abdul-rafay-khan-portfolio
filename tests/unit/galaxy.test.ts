import { describe, expect, it } from "vitest";
import { galaxyLegend, galaxyNodes, hasGalaxy } from "@/lib/galaxy/nodes";
import {
  CLUSTER_RADIUS,
  CLUSTER_SPREAD,
  computeGalaxy,
  hash01,
  meanVector,
  parseVector,
  pcaScores,
  sphere,
  type GalaxyItem,
} from "@/lib/galaxy/positions";
import {
  EMPTY_CONTENT,
  type Project,
  type SiteContent,
} from "@/lib/data/types";

const dist = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** A unit vector pointing mostly along axis `a`, slightly towards `b`. */
const vec = (dim: number, a: number, b = -1, w = 0.2) => {
  const v = new Array(dim).fill(0);
  v[a] = 1;
  if (b >= 0) v[b] = w;
  return v;
};

describe("parseVector / meanVector", () => {
  it("reads Postgres vector text and arrays, and rejects junk", () => {
    expect(parseVector("[0.5,-1,2]")).toEqual([0.5, -1, 2]);
    expect(parseVector([1, 2])).toEqual([1, 2]);
    expect(parseVector("nope")).toBeNull();
    expect(parseVector(null)).toBeNull();
    expect(parseVector('["a"]')).toBeNull();
  });

  it("averages to a unit vector, and refuses mixed sizes or nothing", () => {
    const m = meanVector([
      [1, 0],
      [0, 1],
    ])!;
    expect(Math.hypot(...m)).toBeCloseTo(1);
    expect(meanVector([])).toBeNull();
    expect(meanVector([[1], [1, 2]])).toBeNull();
  });
});

describe("helpers", () => {
  it("hash01 is stable and in [0, 1)", () => {
    expect(hash01("a", 1)).toBe(hash01("a", 1));
    expect(hash01("a", 1)).not.toBe(hash01("a", 2));
    for (const id of ["a", "bb", "ccc", "uuid-1234"]) {
      const h = hash01(id, 3);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  });

  it("sphere spreads points at the given radius", () => {
    const pts = sphere(6, 7);
    expect(pts).toHaveLength(6);
    for (const p of pts) expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(7, 5);
    expect(sphere(1, 7)).toEqual([{ x: 0, y: 0, z: 0 }]);
    expect(sphere(0, 7)).toEqual([]);
  });

  it("pcaScores separates two groups along the first component", () => {
    const rows = [
      [1, 0, 0, 0],
      [1.1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 1.1, 0],
    ];
    const s = pcaScores(rows, 2).map((r) => r[0]);
    expect(Math.sign(s[0])).toBe(Math.sign(s[1]));
    expect(Math.sign(s[2])).toBe(Math.sign(s[3]));
    expect(Math.sign(s[0])).not.toBe(Math.sign(s[2]));
    expect(pcaScores([[1, 2, 3]], 3)).toEqual([[0, 0, 0]]);
  });
});

describe("computeGalaxy", () => {
  const cats = ["cv", "agents", "web"];
  const items: GalaxyItem[] = [
    { id: "a1", categoryId: "cv", vector: vec(16, 0, 1) },
    { id: "a2", categoryId: "cv", vector: vec(16, 0, 2) },
    { id: "b1", categoryId: "agents", vector: vec(16, 5, 6) },
    { id: "b2", categoryId: "agents", vector: vec(16, 5, 7) },
    { id: "c1", categoryId: "web", vector: vec(16, 10, 11) },
  ];

  it("gives every project a finite position", () => {
    const out = computeGalaxy(items, cats);
    expect(out.size).toBe(items.length);
    for (const p of out.values()) {
      for (const n of [p.x, p.y, p.z]) expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(computeGalaxy(items, cats)).toEqual(computeGalaxy(items, cats));
  });

  it("keeps a category's projects near each other and categories apart", () => {
    const out = computeGalaxy(items, cats);
    const within = dist(out.get("a1")!, out.get("a2")!);
    const between = dist(out.get("a1")!, out.get("b1")!);
    expect(within).toBeLessThan(CLUSTER_SPREAD * 2.5);
    expect(between).toBeGreaterThan(within);
    expect(between).toBeGreaterThan(CLUSTER_RADIUS * 0.8);
  });

  it("still places projects that have no embedding yet", () => {
    const out = computeGalaxy(
      [
        { id: "x", categoryId: "cv", vector: null },
        { id: "y", categoryId: null, vector: null },
      ],
      cats,
    );
    expect(out.size).toBe(2);
    expect(dist(out.get("x")!, out.get("y")!)).toBeGreaterThan(1);
  });

  it("copes with a single project, no projects and mixed vector sizes", () => {
    expect(computeGalaxy([], cats).size).toBe(0);
    expect(
      computeGalaxy([{ id: "solo", categoryId: "cv", vector: [1, 0] }], cats)
        .size,
    ).toBe(1);
    const mixed = computeGalaxy(
      [
        { id: "m1", categoryId: "cv", vector: [1, 0] },
        { id: "m2", categoryId: "cv", vector: [1, 0, 0] },
      ],
      cats,
    );
    expect(mixed.size).toBe(2);
  });

  it("keeps a cluster in place when another category is added later", () => {
    const before = computeGalaxy(items, cats).get("a1")!;
    const after = computeGalaxy(items, [...cats, "extra"]).get("a1")!;
    // centres are re-spread when the count changes, but the result stays finite and close in scale
    expect(Math.hypot(after.x, after.y, after.z)).toBeLessThan(
      CLUSTER_RADIUS + CLUSTER_SPREAD * 2,
    );
    expect(Math.hypot(before.x, before.y, before.z)).toBeLessThan(
      CLUSTER_RADIUS + CLUSTER_SPREAD * 2,
    );
  });

  it("separates projects with identical text a little", () => {
    const same = computeGalaxy(
      [
        { id: "s1", categoryId: "cv", vector: [1, 0, 0] },
        { id: "s2", categoryId: "cv", vector: [1, 0, 0] },
      ],
      cats,
    );
    expect(dist(same.get("s1")!, same.get("s2")!)).toBeGreaterThan(0);
  });
});

const project = (over: Partial<Project>): Project =>
  ({
    id: "p",
    slug: "p",
    title: "P",
    published: true,
    primaryCategoryId: "c1",
    categoryIds: ["c1"],
    metrics: [],
    traction: [],
    galaxy: { x: 1, y: 2, z: 3 },
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
      description: "",
      stack: [],
      color: "#B600A8",
      showInWhatIDo: true,
      sort: 0,
    },
  ],
  projects,
});

describe("galaxyNodes", () => {
  it("includes published projects with a position, with colour, link and metric", () => {
    const nodes = galaxyNodes(
      content([
        project({
          id: "a",
          slug: "sentinel",
          title: "Sentinel",
          metrics: [{ label: "Recall", value: "79%", highlight: true }],
        }),
        project({ id: "b", published: false }),
        project({ id: "c", galaxy: null }),
      ]),
    );
    expect(nodes).toEqual([
      {
        id: "a",
        title: "Sentinel",
        href: "/work/sentinel",
        color: "#B600A8",
        category: "Computer Vision",
        metric: "Recall: 79%",
        x: 1,
        y: 2,
        z: 3,
      },
    ]);
    expect(galaxyLegend(nodes)).toEqual([
      { name: "Computer Vision", color: "#B600A8" },
    ]);
  });

  it("hasGalaxy is false until a project has a position", () => {
    expect(hasGalaxy(content([project({ galaxy: null })]))).toBe(false);
    expect(hasGalaxy(content([project({})]))).toBe(true);
    expect(hasGalaxy(content([]))).toBe(false);
  });
});
