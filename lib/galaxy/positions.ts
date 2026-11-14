/**
 * Galaxy layout: every project becomes a point in 3D.
 *  - similar projects sit near each other (PCA of their embeddings);
 *  - each category is a cluster: its projects are offset around a centre
 *    placed on a sphere, so clusters are visibly separate.
 * Pure and deterministic, so it can be tested and recomputed on every save.
 */

export type Vec3 = { x: number; y: number; z: number };

export type GalaxyItem = {
  id: string;
  /** primary category id, or null for "no category" */
  categoryId: string | null;
  /** the project's embedding (any length), or null when not indexed yet */
  vector: number[] | null;
};

/** Distance of each cluster centre from the middle. */
export const CLUSTER_RADIUS = 7;
/** How far a project may sit from its cluster centre. */
export const CLUSTER_SPREAD = 2.4;

/** "[0.1,0.2,…]" (how Postgres returns a vector) → numbers. */
export function parseVector(text: unknown): number[] | null {
  if (Array.isArray(text)) return text.map(Number);
  if (typeof text !== "string") return null;
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) && v.every((n) => typeof n === "number") ? v : null;
  } catch {
    return null;
  }
}

/** Mean of several vectors, scaled to unit length. */
export function meanVector(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dim = vectors[0].length;
  const sum = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    if (v.length !== dim) return null;
    for (let i = 0; i < dim; i++) sum[i] += v[i];
  }
  const norm = Math.hypot(...sum) || 1;
  return sum.map((x) => x / norm);
}

/** Small stable pseudo-random number in [0, 1) from a string and a salt. */
export function hash01(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** `n` points spread evenly over a sphere (Fibonacci lattice). */
export function sphere(n: number, radius: number): Vec3[] {
  if (n <= 0) return [];
  if (n === 1) return [{ x: 0, y: 0, z: 0 }];
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * i) / (n - 1);
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = golden * i;
    return {
      x: Math.cos(t) * r * radius,
      y: y * radius,
      z: Math.sin(t) * r * radius,
    };
  });
}

/**
 * Top `k` principal-component scores for each row, via the Gram matrix
 * (rows ≪ dimensions, so this is tiny) and power iteration with deflation.
 */
export function pcaScores(rows: number[][], k = 3): number[][] {
  const n = rows.length;
  const scores: number[][] = Array.from({ length: n }, () =>
    new Array(k).fill(0),
  );
  if (n < 2) return scores;
  const dim = rows[0].length;
  const mean = new Array<number>(dim).fill(0);
  for (const r of rows) for (let i = 0; i < dim; i++) mean[i] += r[i] / n;
  const X = rows.map((r) => r.map((x, i) => x - mean[i]));
  const G: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      let s = 0;
      for (let d = 0; d < dim; d++) s += X[i][d] * X[j][d];
      return s;
    }),
  );

  for (let c = 0; c < Math.min(k, n); c++) {
    let u = Array.from({ length: n }, (_, i) => 1 + ((i * 7 + c * 3) % 5) / 10);
    let lambda = 0;
    for (let iter = 0; iter < 200; iter++) {
      const w = G.map((row) => row.reduce((s, g, j) => s + g * u[j], 0));
      const norm = Math.hypot(...w);
      if (norm < 1e-12) {
        lambda = 0;
        break;
      }
      const next = w.map((x) => x / norm);
      const delta = Math.hypot(...next.map((x, i) => x - u[i]));
      u = next;
      lambda = norm;
      if (delta < 1e-10) break;
    }
    const scale = Math.sqrt(Math.max(lambda, 0));
    for (let i = 0; i < n; i++) scores[i][c] = u[i] * scale;
    // deflate: remove this component from G
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) G[i][j] -= lambda * u[i] * u[j];
  }
  return scores;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Positions for every item. `categoryIds` is the full ordered category list
 * (so a cluster keeps its place when other categories change).
 */
export function computeGalaxy(
  items: GalaxyItem[],
  categoryIds: string[],
): Map<string, Vec3> {
  const out = new Map<string, Vec3>();
  if (items.length === 0) return out;

  const slots = [...categoryIds, "__none__"];
  const centres = sphere(slots.length, CLUSTER_RADIUS);
  const centreOf = (cat: string | null): Vec3 => {
    const i = slots.indexOf(cat ?? "__none__");
    return centres[i < 0 ? slots.length - 1 : i];
  };

  // PCA runs inside each category, so every cluster uses its full spread
  // (one global PCA would spend its axes separating the categories instead).
  const groups = new Map<string, GalaxyItem[]>();
  for (const item of items) {
    const key = item.categoryId ?? "__none__";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  for (const group of groups.values()) {
    const withVector = group.filter((i) => i.vector && i.vector.length > 0);
    const dims = new Set(withVector.map((i) => i.vector!.length));
    const usable = dims.size === 1 ? withVector : [];
    const scores = pcaScores(
      usable.map((i) => i.vector!),
      3,
    );
    const maxAbs = [0, 1, 2].map((c) =>
      Math.max(...scores.map((s) => Math.abs(s[c])), 0),
    );
    const byId = new Map(usable.map((it, idx) => [it.id, scores[idx]]));

    for (const item of group) {
      const s = byId.get(item.id);
      // an axis with no spread (one project, identical text, too few
      // projects for a third component) falls back to a stable scatter
      const local = [0, 1, 2].map((c) =>
        s && maxAbs[c] > 1e-9 ? s[c] / maxAbs[c] : hash01(item.id, c) * 2 - 1,
      );
      const jitter = [0, 1, 2].map(
        (c) => (hash01(item.id, c + 10) - 0.5) * 0.18,
      );
      const centre = centreOf(item.categoryId);
      out.set(item.id, {
        x: round(centre.x + (local[0] + jitter[0]) * CLUSTER_SPREAD),
        y: round(centre.y + (local[1] + jitter[1]) * CLUSTER_SPREAD),
        z: round(centre.z + (local[2] + jitter[2]) * CLUSTER_SPREAD),
      });
    }
  }
  return out;
}
