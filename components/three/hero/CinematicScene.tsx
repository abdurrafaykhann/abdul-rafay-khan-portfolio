"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
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
  photo: THREE.Texture;
  depth: THREE.Texture;
};

function World({
  world,
  layout,
  skipSignal,
  onPhase,
}: {
  world: HeroWorld;
  layout: PortraitLayout;
  skipSignal: number;
  onPhase: (phase: Phase) => void;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const reported = useRef<Phase | null>(null);

  useEffect(() => world.setLayout(layout), [world, layout]);
  useEffect(() => {
    if (skipSignal > 0) world.skip();
  }, [world, skipSignal]);

  // pointer in stage pixels (the canvas fills the stage)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = document.getElementById("hero-stage");
      if (!el) return;
      const r = el.getBoundingClientRect();
      world.pointerMove(
        e.clientX - r.left,
        e.clientY - r.top,
        performance.now(),
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [world]);

  useFrame((state, delta) => {
    world.update(state.camera, delta, state.gl.domElement.height);
    if (reported.current !== world.phase) {
      reported.current = world.phase;
      onPhase(world.phase);
    }
  });

  return <primitive ref={rootRef} object={world.root} />;
}

function loadTexture(src: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) =>
    new THREE.TextureLoader().load(
      src,
      (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.minFilter = THREE.LinearFilter;
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
    <Canvas
      linear
      flat
      dpr={[1, props.touch ? 1.25 : 1.5]}
      frameloop={props.active ? "always" : "never"}
      camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 0.05, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <World
        world={world}
        layout={props.layout}
        skipSignal={props.skipSignal}
        onPhase={onPhase}
      />
    </Canvas>
  );
}
