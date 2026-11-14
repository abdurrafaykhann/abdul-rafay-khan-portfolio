/** Timing, data and device rules for the 3D hero portrait (no three.js here). */

/** Whole particle assembly, seconds (spec: about 1.5 s). */
export const ASSEMBLE_SECONDS = 1.5;
/** Particles → photo cross-fade, seconds. */
export const CROSSFADE_SECONDS = 0.45;
/** How long the last particle may wait before it starts moving (0..1 of the run). */
export const MAX_STAGGER = 0.35;
export const POINTS_DESKTOP = 8000;
export const POINTS_PHONE = 3000;
export const SESSION_KEY = "hero-intro-played";
const FLOATS_PER_POINT = 6;

export type ParticleData = {
  count: number;
  /** x, y in [-0.5, 0.5] (y up), z = depth 0..1 */
  positions: Float32Array;
  colors: Float32Array;
};

/** Decodes public/hero/particles.bin (float32 x,y,z,r,g,b per point). */
export function parseParticles(
  buffer: ArrayBuffer,
  limit = Infinity,
): ParticleData {
  const all = new Float32Array(buffer);
  const total = Math.floor(all.length / FLOATS_PER_POINT);
  const count = Math.max(0, Math.min(total, limit));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const o = i * FLOATS_PER_POINT;
    positions[i * 3] = all[o] - 0.5; // u → x
    positions[i * 3 + 1] = 0.5 - all[o + 1]; // v (top-down) → y (up)
    positions[i * 3 + 2] = all[o + 2];
    colors[i * 3] = all[o + 3];
    colors[i * 3 + 1] = all[o + 4];
    colors[i * 3 + 2] = all[o + 5];
  }
  return { count, positions, colors };
}

/** easeOutCubic: fast start, gentle landing. */
export function easeOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - (1 - c) ** 3;
}

/**
 * Progress (0..1, eased) of one particle at overall progress t, given its
 * random delay in [0, 1). Mirrors the vertex shader so it can be tested.
 */
export function particleProgress(t: number, delay: number): number {
  const start = delay * MAX_STAGGER;
  return easeOut((t - start) / (1 - start));
}

export type DeviceInfo = {
  webgl: boolean;
  deviceMemory?: number; // GB (Chrome only)
  cores?: number;
  saveData?: boolean;
};

/** Whether to run the 3D portrait at all (otherwise the static photo stays). */
export function canRun3D(d: DeviceInfo): boolean {
  if (!d.webgl || d.saveData) return false;
  if (d.deviceMemory !== undefined && d.deviceMemory < 2) return false;
  if (d.cores !== undefined && d.cores < 2) return false;
  return true;
}

/** Phones and tablets: no hover → automatic sway and fewer particles. */
export function isTouchOnly(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none)").matches
  );
}

export function detectDevice(): DeviceInfo {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  let webgl = false;
  try {
    const c = document.createElement("canvas");
    webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webgl = false;
  }
  return {
    webgl,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    saveData: nav.connection?.saveData,
  };
}

/** The intro plays once per browser session. */
export function introAlreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* private mode: it just plays again next time */
  }
}

/**
 * How strongly a fast mouse scatters particles: 0 below ~0.6 px/ms,
 * reaching 1 at ~3 px/ms.
 */
export function scatterFromSpeed(pxPerMs: number): number {
  return Math.min(1, Math.max(0, (pxPerMs - 0.6) / 2.4));
}
