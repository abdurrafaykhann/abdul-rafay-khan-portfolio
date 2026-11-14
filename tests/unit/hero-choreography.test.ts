import { describe, expect, it } from "vitest";
import {
  cameraZ,
  choreography,
  portraitWorldRect,
  smoothstep,
} from "@/lib/hero/choreography";
import {
  CAMERA_Z,
  HERO_COLORS,
  TIERS,
  WORLD_HEIGHT,
  tierForWidth,
} from "@/lib/hero/config";

describe("scroll choreography", () => {
  it("starts with only the portrait and atmosphere", () => {
    const c = choreography(0);
    expect(c).toMatchObject({ dolly: 0, neural: 0, stack: 0, final: 0 });
    expect(c.atmosphere).toBeGreaterThan(0.5);
  });

  it("plays the scenes in order: camera → neural network → architecture → final", () => {
    const at = (p: number) => choreography(p);
    expect(at(0.3).dolly).toBeGreaterThan(0);
    expect(at(0.3).neural).toBeGreaterThan(0.2);
    expect(at(0.3).stack).toBe(0);
    expect(at(0.45).neural).toBe(1);
    expect(at(0.65).stack).toBeGreaterThan(0.5);
    expect(at(0.65).final).toBe(0);
    expect(at(0.9).final).toBeGreaterThan(0.3);
  });

  it("ends settled: camera arrived, architecture in, network receded but present", () => {
    const c = choreography(1);
    expect(c.dolly).toBe(1);
    expect(c.stack).toBe(1);
    expect(c.final).toBe(1);
    expect(c.neural).toBeCloseTo(0.4);
  });

  it("is continuous (no jumps) and clamps outside 0..1", () => {
    let prev = choreography(0);
    for (let p = 0.005; p <= 1; p += 0.005) {
      const c = choreography(p);
      for (const k of [
        "dolly",
        "neural",
        "stack",
        "final",
        "atmosphere",
      ] as const) {
        expect(Math.abs(c[k] - prev[k])).toBeLessThan(0.05);
      }
      prev = c;
    }
    expect(choreography(-1)).toEqual(choreography(0));
    expect(choreography(2)).toEqual(choreography(1));
  });

  it("is the same forwards and backwards (pure function of scroll)", () => {
    expect(choreography(0.42)).toEqual(choreography(0.42));
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});

describe("camera", () => {
  it("rests at CAMERA_Z and ends maxScale× closer", () => {
    expect(cameraZ(0, 1.3)).toBe(CAMERA_Z);
    expect(cameraZ(1, 1.3)).toBeCloseTo(CAMERA_Z / 1.3);
    // apparent size of the portrait (at z = 0) grows by exactly maxScale
    expect(CAMERA_Z / cameraZ(1, TIERS.desktop.maxScale)).toBeCloseTo(
      TIERS.desktop.maxScale,
    );
  });

  it("never passes through the portrait", () => {
    for (const t of Object.values(TIERS)) {
      expect(cameraZ(1, t.maxScale)).toBeGreaterThan(1.5);
    }
  });
});

describe("portraitWorldRect", () => {
  it("maps the static photo's pixels onto the same place in the 3D world", () => {
    // 1440 × 900 hero; a 540 × 702 photo centred, sitting on the bottom edge
    const r = portraitWorldRect({
      stageW: 1440,
      stageH: 900,
      cx: 720,
      top: 198,
      w: 540,
      h: 702,
    });
    const perPx = WORLD_HEIGHT / 900;
    expect(r.x).toBeCloseTo(0);
    expect(r.w).toBeCloseTo(540 * perPx);
    expect(r.h).toBeCloseTo(702 * perPx);
    // bottom edge of the photo = bottom edge of the view
    expect(r.y - r.h / 2).toBeCloseTo(-WORLD_HEIGHT / 2);
  });

  it("handles an off-centre photo", () => {
    const r = portraitWorldRect({
      stageW: 1000,
      stageH: 1000,
      cx: 750,
      top: 0,
      w: 100,
      h: 100,
    });
    expect(r.x).toBeCloseTo(WORLD_HEIGHT * 0.25);
    expect(r.y).toBeCloseTo(WORLD_HEIGHT * 0.45);
  });
});

describe("tiers", () => {
  it("picks lighter settings on smaller screens", () => {
    expect(tierForWidth(1440).name).toBe("desktop");
    expect(tierForWidth(800).name).toBe("tablet");
    expect(tierForWidth(375).name).toBe("mobile");
    const { desktop, tablet, mobile } = TIERS;
    expect(mobile.dust).toBeLessThan(tablet.dust);
    expect(tablet.dust).toBeLessThan(desktop.dust);
    expect(mobile.nodes).toBeLessThan(desktop.nodes);
    expect(mobile.travel).toBeLessThan(desktop.travel);
    expect(mobile.maxScale).toBeLessThan(desktop.maxScale);
  });
});

describe("palette", () => {
  it("uses exactly the site's colours", () => {
    expect(HERO_COLORS).toMatchObject({
      ink: "#0C0C0C",
      mist: "#D7E2EA",
      plum: "#18011F",
      magenta: "#B600A8",
      purple: "#7621B0",
      glow: "#7721B1",
      orange: "#BE4C00",
    });
    expect(HERO_COLORS.categories).toEqual([
      "#B600A8",
      "#7621B0",
      "#BE4C00",
      "#2F80ED",
      "#27AE60",
      "#D7E2EA",
    ]);
  });
});
