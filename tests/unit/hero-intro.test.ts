import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ASSEMBLE_SECONDS,
  MAX_STAGGER,
  POINTS_DESKTOP,
  POINTS_PHONE,
  SESSION_KEY,
  canRun3D,
  easeOut,
  introAlreadyPlayed,
  markIntroPlayed,
  parseParticles,
  particleProgress,
  scatterFromSpeed,
} from "@/lib/hero/intro";

afterEach(() => sessionStorage.clear());

describe("intro timing", () => {
  it("assembles in about 1.5 seconds", () => {
    expect(ASSEMBLE_SECONDS).toBe(1.5);
  });

  it("every particle starts at 0 and lands exactly at 1", () => {
    for (const delay of [0, 0.3, 0.99]) {
      expect(particleProgress(0, delay)).toBe(0);
      expect(particleProgress(1, delay)).toBe(1);
    }
  });

  it("late particles wait, then catch up (stagger)", () => {
    const early = particleProgress(0.2, 0);
    const late = particleProgress(0.2, 1);
    expect(late).toBe(0); // 0.2 < MAX_STAGGER: hasn't started yet
    expect(early).toBeGreaterThan(0.3);
    expect(MAX_STAGGER).toBeLessThan(1);
  });

  it("eases out: fast start, slow landing", () => {
    expect(easeOut(0.5)).toBeGreaterThan(0.8);
    expect(easeOut(-1)).toBe(0);
    expect(easeOut(2)).toBe(1);
  });
});

describe("parseParticles", () => {
  const encode = (rows: number[][]) => new Float32Array(rows.flat()).buffer;

  it("turns image coordinates into centred, y-up positions", () => {
    const d = parseParticles(
      encode([
        [0, 0, 0.8, 1, 0.5, 0.25],
        [1, 1, 0.2, 0, 0, 0],
      ]),
    );
    expect(d.count).toBe(2);
    expect(Array.from(d.positions.slice(0, 3))).toEqual([
      -0.5,
      0.5,
      expect.closeTo(0.8, 5),
    ]);
    expect(Array.from(d.positions.slice(3, 6))).toEqual([
      0.5,
      -0.5,
      expect.closeTo(0.2, 5),
    ]);
    expect(Array.from(d.colors.slice(0, 3))).toEqual([1, 0.5, 0.25]);
  });

  it("can take just the first N points (phones)", () => {
    const d = parseParticles(
      encode([
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ]),
      2,
    );
    expect(d.count).toBe(2);
    expect(d.positions).toHaveLength(6);
  });

  it("reads the real generated file", () => {
    const file = path.join(process.cwd(), "public", "hero", "particles.bin");
    if (!fs.existsSync(file)) return; // not generated in this checkout
    const buf = fs.readFileSync(file);
    const d = parseParticles(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    );
    expect(d.count).toBe(POINTS_DESKTOP);
    expect(POINTS_PHONE).toBeLessThan(POINTS_DESKTOP);
    for (let i = 0; i < d.count * 3; i++) {
      expect(Math.abs(d.positions[i])).toBeLessThanOrEqual(1);
      expect(d.colors[i]).toBeGreaterThanOrEqual(0);
      expect(d.colors[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe("canRun3D", () => {
  it("needs WebGL and a reasonable device, and respects Save-Data", () => {
    expect(canRun3D({ webgl: true, deviceMemory: 8, cores: 8 })).toBe(true);
    expect(canRun3D({ webgl: true })).toBe(true); // Safari/Firefox give no hints
    expect(canRun3D({ webgl: false })).toBe(false);
    expect(canRun3D({ webgl: true, saveData: true })).toBe(false);
    expect(canRun3D({ webgl: true, deviceMemory: 1 })).toBe(false);
    expect(canRun3D({ webgl: true, cores: 1 })).toBe(false);
  });
});

describe("once per session", () => {
  it("remembers that the intro played", () => {
    expect(introAlreadyPlayed()).toBe(false);
    markIntroPlayed();
    expect(introAlreadyPlayed()).toBe(true);
    expect(sessionStorage.getItem(SESSION_KEY)).toBe("1");
  });
});

describe("scatterFromSpeed", () => {
  it("only fast movements scatter, capped at full strength", () => {
    expect(scatterFromSpeed(0.3)).toBe(0);
    expect(scatterFromSpeed(1.8)).toBeCloseTo(0.5);
    expect(scatterFromSpeed(10)).toBe(1);
  });
});
