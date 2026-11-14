import { CAMERA_Z, WORLD_HEIGHT } from "./config";

/**
 * The scroll choreography as pure maths: given scroll progress p (0..1),
 * how far each part of the scene has come in. One GSAP timeline scrubs p;
 * everything in the 3D scene derives from it, so it reverses naturally.
 *
 *   0.00–0.15  Scene 1  initial reveal (portrait, atmosphere, dust)
 *   0.08–0.85  Scene 2  camera travels forward
 *   0.18–0.55  Scene 3  neural network builds, then recedes
 *   0.50–0.80  Scene 4  full-stack architecture assembles
 *   0.82–1.00  Scene 5  final reveal: everything settles
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export type Choreography = {
  /** camera travel, 0 = resting, 1 = closest */
  dolly: number;
  /** neural network visibility */
  neural: number;
  /** software-architecture visibility */
  stack: number;
  /** final-reveal amount (warm light, settled environment) */
  final: number;
  /** atmospheric glow strength */
  atmosphere: number;
};

export function choreography(progress: number): Choreography {
  const p = clamp01(progress);
  return {
    dolly: smoothstep(0.08, 0.85, p),
    neural: smoothstep(0.18, 0.4, p) * (1 - 0.6 * smoothstep(0.55, 0.78, p)),
    stack: smoothstep(0.5, 0.72, p),
    final: smoothstep(0.82, 1, p),
    atmosphere: 0.6 + 0.4 * smoothstep(0, 0.3, p),
  };
}

/** Camera distance for a dolly amount: the portrait ends maxScale× larger. */
export function cameraZ(dolly: number, maxScale: number): number {
  return CAMERA_Z / (1 + (maxScale - 1) * clamp01(dolly));
}

/** Where the static photo sits inside the hero, in CSS pixels. */
export type PortraitLayout = {
  stageW: number;
  stageH: number;
  /** portrait centre x, top y, and size */
  cx: number;
  top: number;
  w: number;
  h: number;
};

/**
 * The same rectangle in world units at z = 0 (camera at rest), so the 3D
 * photo lands exactly on top of the static one.
 */
export function portraitWorldRect(l: PortraitLayout) {
  const perPx = WORLD_HEIGHT / l.stageH;
  return {
    x: (l.cx - l.stageW / 2) * perPx,
    y: (l.stageH / 2 - (l.top + l.h / 2)) * perPx,
    w: l.w * perPx,
    h: l.h * perPx,
  };
}
