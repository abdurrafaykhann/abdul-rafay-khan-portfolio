import { Camera, Group, Texture } from "three";
import {
  cameraZ,
  choreography,
  portraitWorldRect,
  type PortraitLayout,
} from "@/lib/hero/choreography";
import { FOV, type Tier } from "@/lib/hero/config";
import { scatterFromSpeed, type ParticleData } from "@/lib/hero/intro";
import {
  createArchitecture,
  createAtmosphere,
  createDust,
  createLights,
  createNeuralNetwork,
} from "./environment";
import { createPortrait, type Phase } from "./portrait";
import type { Frame, Layer } from "./shared";

/**
 * The whole hero world: the portrait, its environment and the camera move.
 * Plain three.js (no React): the scene component only calls update() once a
 * frame. Scroll progress arrives through `rig.p`, scrubbed by one GSAP
 * timeline, so the sequence plays forwards and backwards with the scroll.
 */

export type HeroRig = { p: number };

export type HeroWorld = ReturnType<typeof createHeroWorld>;

export function createHeroWorld(o: {
  data: ParticleData;
  photo: Texture;
  depth: Texture;
  playIntro: boolean;
  touch: boolean;
  tier: Tier;
  rig: HeroRig;
}) {
  const root = new Group();
  const env = new Group();
  const portrait = createPortrait(o);
  const layers: Layer[] = [
    createLights(),
    createAtmosphere(),
    createNeuralNetwork(o.tier),
    createArchitecture(o.tier),
    createDust(o.tier),
  ];
  layers.forEach((l) => env.add(l.object));
  root.add(env, portrait.object);

  let layout: PortraitLayout | null = null;
  let time = 0;
  const pointer = {
    // relative to the portrait box
    nx: 0,
    ny: 0,
    // across the whole hero
    px: 0,
    py: 0,
    scatter: 0,
    scatterAt: 0,
    lastX: 0,
    lastY: 0,
    lastT: 0,
  };
  const sway = { x: 0, y: 0 };
  const tan = Math.tan((FOV * Math.PI) / 360);

  const world = {
    root,
    get phase(): Phase {
      return portrait.phase;
    },
    skip: () => portrait.skip(),

    /** Place the 3D photo exactly over the static one. */
    setLayout(l: PortraitLayout) {
      layout = l;
      const r = portraitWorldRect(l);
      portrait.object.position.set(r.x, r.y, 0);
      portrait.object.scale.set(r.w, r.h, 1);
      // narrow screens see a narrower slice of the world: pull the sides in
      const aspect = l.stageW / l.stageH;
      env.scale.x = Math.min(1, Math.max(0.5, aspect / 1.45));
    },

    /** Pointer position in stage pixels. */
    pointerMove(x: number, y: number, now: number) {
      if (!layout) return;
      const clamp = (v: number) => Math.max(-1.6, Math.min(1.6, v));
      pointer.nx = clamp(((x - layout.cx) / layout.w) * 2);
      pointer.ny = clamp(((y - (layout.top + layout.h / 2)) / layout.h) * 2);
      pointer.px = clamp((x / layout.stageW) * 2 - 1);
      pointer.py = clamp((y / layout.stageH) * 2 - 1);
      const dtMs = now - pointer.lastT;
      if (pointer.lastT && dtMs > 0 && dtMs < 100) {
        const speed = Math.hypot(x - pointer.lastX, y - pointer.lastY) / dtMs;
        const s = scatterFromSpeed(speed);
        if (s > scatterNow(now)) {
          pointer.scatter = s;
          pointer.scatterAt = now;
        }
      }
      pointer.lastX = x;
      pointer.lastY = y;
      pointer.lastT = now;
    },

    /** Advance one frame. `bufferHeight` is the canvas height in device px. */
    update(camera: Camera, dt: number, bufferHeight: number) {
      const step = Math.min(dt, 0.05);
      time += step;
      const c = choreography(o.rig.p);
      const scale = bufferHeight / (2 * tan);

      // the camera travels forward and drifts slightly with the pointer
      const ease = 1 - Math.exp(-step * 3);
      const tx = o.touch ? Math.sin(time * 0.3) * 0.3 : pointer.px;
      const ty = o.touch ? Math.sin(time * 0.23) * 0.2 : pointer.py;
      sway.x += (tx - sway.x) * ease;
      sway.y += (ty - sway.y) * ease;
      // (sway eases in with the portrait, so the hand-over from the static
      // photo is seamless; the sideways arc is zero at both ends of the move)
      const presence = portrait.presence;
      camera.position.set(
        sway.x * 0.045 * presence + Math.sin(c.dolly * Math.PI) * 0.05,
        -sway.y * 0.03 * presence,
        cameraZ(c.dolly, o.tier.maxScale),
      );
      camera.lookAt(camera.position.x * 0.35, camera.position.y * 0.35, 0);

      portrait.update(time, step, scale, {
        nx: pointer.nx,
        ny: pointer.ny,
        scatter: scatterNow(performance.now()),
      });

      const frame: Frame = {
        t: time,
        dt: step,
        c,
        env: portrait.presence,
        px: sway.x,
        py: sway.y,
        scale,
      };
      for (const l of layers) l.update(frame);
    },

    dispose() {
      layers.forEach((l) => l.dispose());
      portrait.dispose();
    },
  };

  function scatterNow(now: number) {
    return (
      pointer.scatter * Math.exp(-((now - pointer.scatterAt) / 1000) * 3.5)
    );
  }

  return world;
}
