"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Phase } from "@/components/three/hero/HeroScene";
import {
  POINTS_DESKTOP,
  POINTS_PHONE,
  canRun3D,
  detectDevice,
  introAlreadyPlayed,
  isTouchOnly,
  markIntroPlayed,
} from "@/lib/hero/intro";
import { useMotionEnabled } from "@/lib/motion/use-motion";

// three.js is downloaded only after the page has loaded and is idle
const HeroScene = dynamic(() => import("@/components/three/hero/HeroScene"), {
  ssr: false,
});

export type PortraitAssets = {
  photo: string;
  /** null until tools/portrait_pipeline.py has been run */
  depth: string | null;
  particles: string | null;
};

type Mode = { playIntro: boolean; touch: boolean } | null;

/**
 * The hero photo. The static image renders first (it is the page's main
 * content); the 3D layer loads afterwards and takes over seamlessly:
 * particles assemble into the portrait once per session, then a
 * depth-parallax photo follows the mouse. Plain mode, reduced motion,
 * weak devices and missing assets keep the static photo.
 */
export function HeroPortrait({
  assets,
  alt,
}: {
  assets: PortraitAssets;
  alt: string;
}) {
  const motion = useMotionEnabled();
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [phase, setPhase] = useState<Phase | "off">("off");
  const [skip, setSkip] = useState(0);
  const [active, setActive] = useState(true);
  const has3D = !!(assets.depth && assets.particles);

  // decide whether to start, once the page is loaded and idle
  useEffect(() => {
    if (!motion || !has3D) return;
    let cancelled = false;
    let idleId: number | undefined;
    const start = () => {
      if (cancelled || !canRun3D(detectDevice())) return;
      setMode({ playIntro: !introAlreadyPlayed(), touch: isTouchOnly() });
      setPhase("loading");
    };
    const whenIdle = () => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(start, { timeout: 2000 });
      } else {
        idleId = globalThis.setTimeout(start, 300) as unknown as number;
      }
    };
    // let the photo's entrance animation finish first
    const timer = window.setTimeout(() => {
      if (document.readyState === "complete") whenIdle();
      else window.addEventListener("load", whenIdle, { once: true });
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("load", whenIdle);
      if (idleId !== undefined) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
        window.clearTimeout(idleId);
      }
      setMode(null);
      setPhase("off");
    };
  }, [motion, has3D]);

  // pause rendering while the hero is scrolled out of view
  useEffect(() => {
    const el = box.current;
    if (!el || !mode) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  // any click, key, scroll or touch skips the intro
  const intro = phase === "intro" || phase === "crossfade";
  useEffect(() => {
    if (!intro) return;
    const skipNow = () => setSkip((n) => n + 1);
    const events = [
      "pointerdown",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ] as const;
    events.forEach((ev) =>
      window.addEventListener(ev, skipNow, { passive: true, once: true }),
    );
    return () =>
      events.forEach((ev) => window.removeEventListener(ev, skipNow));
  }, [intro]);

  const onPhase = useCallback((p: Phase) => {
    setPhase(p);
    if (p === "intro") markIntroPlayed();
  }, []);

  // the static photo hides once the 3D layer is showing (or assembling)
  const hideStatic =
    phase === "intro" || phase === "crossfade" || phase === "settled";

  return (
    <div ref={box} className="relative mx-auto w-fit" data-hero-3d={phase}>
      {/* Plain <img>: the largest element on first paint (LCP), no JS needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assets.photo}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="block h-auto max-h-[78svh] w-auto max-w-full [mask-image:linear-gradient(to_bottom,black_55%,transparent_97%)] transition-opacity duration-300 select-none"
        style={{ opacity: hideStatic ? 0 : 1 }}
      />
      {mode && assets.depth && assets.particles && (
        <HeroScene
          photoSrc={assets.photo}
          depthSrc={assets.depth}
          particlesSrc={assets.particles}
          playIntro={mode.playIntro}
          touch={mode.touch}
          particleLimit={mode.touch ? POINTS_PHONE : POINTS_DESKTOP}
          skipSignal={skip}
          active={active}
          onPhase={onPhase}
        />
      )}
    </div>
  );
}
