"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  LinearFilter,
  LinearSRGBColorSpace,
  NoColorSpace,
  NoToneMapping,
  PerspectiveCamera,
  Scene,
  Texture,
  TextureLoader,
  WebGLRenderer,
} from "three";
import type { PortraitLayout } from "@/lib/hero/choreography";
import { CAMERA_Z, FOV, type Tier } from "@/lib/hero/config";
import { parseParticles, type ParticleData } from "@/lib/hero/intro";
import type { Phase } from "./world/portrait";
import { createHeroWorld, type HeroRig, type HeroWorld } from "./world/world";

export type { Phase };

/**
 * The cinematic hero canvas: fills the hero, holds the whole 3D world
 * (see ./world). React renders it once; every frame is plain three.js.
 */

type Props = {
  photoSrc: string;
  depthSrc: string;
  particlesSrc: string;
  playIntro: boolean;
  touch: boolean;
  tier: Tier;
  particleLimit: number;
  layout: PortraitLayout;
  /** scroll progress, written by the GSAP timeline */
  rig: RefObject<HeroRig>;
  /** increments when the visitor asks to skip the intro */
  skipSignal: number;
  active: boolean;
  onPhase: (phase: Phase) => void;
};

type Assets = {
  data: ParticleData;
  photo: Texture;
  depth: Texture;
};

/**
 * Plain three.js host (no React Three Fiber, so its renderer and reconciler
 * are not downloaded for this one canvas): a renderer that fills the stage,
 * and one animation loop that advances the world. Pauses while off screen.
 */
function Stage({
  world,
  layout,
  skipSignal,
  touch,
  active,
  onPhase,
}: {
  world: HeroWorld;
  layout: PortraitLayout;
  skipSignal: number;
  touch: boolean;
  active: boolean;
  onPhase: (phase: Phase) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const onPhaseRef = useRef(onPhase);
  const wake = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeRef.current = active;
    if (active) wake.current?.();
  }, [active]);
  useEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);
  useEffect(() => world.setLayout(layout), [world, layout]);
  useEffect(() => {
    if (skipSignal > 0) world.skip();
  }, [world, skipSignal]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    // same colour handling as before: no automatic sRGB output, no tone mapping
    renderer.outputColorSpace = LinearSRGBColorSpace;
    renderer.toneMapping = NoToneMapping;
    const maxDpr = touch ? 1.25 : 1.5;
    const canvas = renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    el.appendChild(canvas);

    const scene = new Scene();
    scene.add(world.root);
    const camera = new PerspectiveCamera(FOV, 1, 0.05, 40);
    camera.position.set(0, 0, CAMERA_Z);
    camera.lookAt(0, 0, 0);

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setPixelRatio(
        Math.min(Math.max(window.devicePixelRatio, 1), maxDpr),
      );
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    let last = performance.now();
    let reported: Phase | null = null;
    let disposed = false;
    const frame = (now: number) => {
      raf = 0;
      if (disposed || !activeRef.current) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      world.update(camera, dt, renderer.domElement.height);
      renderer.render(scene, camera);
      if (reported !== world.phase) {
        reported = world.phase;
        onPhaseRef.current(world.phase);
      }
      raf = requestAnimationFrame(frame);
    };
    wake.current = () => {
      if (!raf && !disposed) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    if (activeRef.current) wake.current();

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      world.pointerMove(
        e.clientX - r.left,
        e.clientY - r.top,
        performance.now(),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      disposed = true;
      wake.current = null;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      scene.remove(world.root);
      renderer.dispose();
      canvas.remove();
    };
  }, [world, touch]);

  return <div ref={host} style={{ position: "absolute", inset: 0 }} />;
}

function loadTexture(src: string): Promise<Texture> {
  return new Promise((resolve, reject) =>
    new TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = NoColorSpace;
        t.minFilter = LinearFilter;
        t.generateMipmaps = false;
        resolve(t);
      },
      undefined,
      reject,
    ),
  );
}

export default function CinematicScene(props: Props) {
  const { photoSrc, depthSrc, particlesSrc, particleLimit, onPhase } = props;
  const [world, setWorld] = useState<HeroWorld | null>(null);
  // the options the world is built with are fixed for its lifetime
  const build = useRef({
    playIntro: props.playIntro,
    touch: props.touch,
    tier: props.tier,
    rig: props.rig,
  });

  useEffect(() => {
    let cancelled = false;
    let made: HeroWorld | null = null;
    let assets: Assets | null = null;
    Promise.all([
      fetch(particlesSrc).then((r) => {
        if (!r.ok) throw new Error(`particles: ${r.status}`);
        return r.arrayBuffer();
      }),
      loadTexture(photoSrc),
      loadTexture(depthSrc),
    ])
      .then(([buf, photo, depth]) => {
        assets = { data: parseParticles(buf, particleLimit), photo, depth };
        if (cancelled) {
          photo.dispose();
          depth.dispose();
          return;
        }
        const b = build.current;
        made = createHeroWorld({
          ...assets,
          playIntro: b.playIntro,
          touch: b.touch,
          tier: b.tier,
          rig: b.rig.current,
        });
        setWorld(made);
      })
      .catch((e) => {
        console.warn("[hero] 3D scene unavailable, keeping the photo:", e);
        onPhase("loading");
      });
    return () => {
      cancelled = true;
      made?.dispose();
      assets?.photo.dispose();
      assets?.depth.dispose();
      setWorld(null);
    };
  }, [photoSrc, depthSrc, particlesSrc, particleLimit, onPhase]);

  if (!world) return null;
  return (
    <Stage
      world={world}
      layout={props.layout}
      skipSignal={props.skipSignal}
      touch={props.touch}
      active={props.active}
      onPhase={onPhase}
    />
  );
}
