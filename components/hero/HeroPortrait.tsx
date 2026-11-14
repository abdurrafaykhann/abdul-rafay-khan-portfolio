"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Phase } from "@/components/three/hero/CinematicScene";
import type { HeroRig } from "@/components/three/hero/world/world";
import type { PortraitLayout } from "@/lib/hero/choreography";
import { cinematicStore } from "@/lib/hero/cinematic-store";
import { tierForWidth, type Tier } from "@/lib/hero/config";
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
import { useHeroScroll } from "./useHeroScroll";

// three.js is downloaded only after the page has loaded and is idle
const CinematicScene = dynamic(
  () => import("@/components/three/hero/CinematicScene"),
  { ssr: false },
);

export type PortraitAssets = {
  photo: string;
  /** null until tools/portrait_pipeline.py has been run */
  depth: string | null;
  particles: string | null;
};

type Mode = {
  playIntro: boolean;
  touch: boolean;
  tier: Tier;
  cinematic: boolean;
};

/**
 * The hero photo. The static image renders first (it is the page's main
 * content and is never altered). After the page is idle the cinematic 3D
 * scene loads into the hero stage and takes over seamlessly: particles
 * assemble into the portrait, then the scroll-driven sequence begins.
 * Plain mode, reduced motion, weak devices and missing assets keep the
 * static photo and an ordinary, unpinned hero.
 */
export function HeroPortrait({
  assets,
  alt,
}: {
  assets: PortraitAssets;
  alt: string;
}) {
  const motion = useMotionEnabled();
  const img = useRef<HTMLImageElement>(null);
  const rig = useRef<HeroRig>({ p: 0 });
  const [mode, setMode] = useState<Mode | null>(null);
  const [stage, setStage] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<PortraitLayout | null>(null);
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
      const el = document.getElementById("hero-stage");
      if (cancelled || !el || !canRun3D(detectDevice())) return;
      const tier = tierForWidth(window.innerWidth);
      // the pinned sequence only starts from the top of the page: making
      // the hero taller under a visitor who already scrolled would jump
      const cinematic = window.scrollY < 8;
      setStage(el);
      setMode({
        playIntro: !introAlreadyPlayed(),
        touch: isTouchOnly(),
        tier,
        cinematic,
      });
      if (cinematic) cinematicStore.set(tier);
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
      cinematicStore.set(null);
      setMode(null);
      setPhase("off");
    };
  }, [motion, has3D]);

  // where the static photo sits inside the hero (so the 3D one matches it)
  useEffect(() => {
    const el = img.current;
    const slot = el?.closest<HTMLElement>("[data-hero-portrait-slot]");
    if (!el || !slot || !stage) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const r = slot.getBoundingClientRect();
      if (!el.offsetWidth || !s.height) return;
      setLayout({
        stageW: s.width,
        stageH: s.height,
        cx: r.left - s.left + r.width / 2,
        top: r.top - s.top,
        w: el.offsetWidth,
        h: el.offsetHeight,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);

  // pause rendering once the hero has scrolled out of view
  useEffect(() => {
    if (!stage) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: "100px",
    });
    io.observe(stage);
    return () => io.disconnect();
  }, [stage]);

  // any click, key, scroll or touch skips the particle intro
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

  const showing =
    phase === "intro" || phase === "crossfade" || phase === "settled";
  useHeroScroll(!!mode?.cinematic && showing, rig);

  return (
    <div className="relative mx-auto w-fit" data-hero-3d={phase}>
      {/* Plain <img>: the largest element on first paint (LCP), no JS needed. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={assets.photo}
        alt={alt}
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="block h-auto max-h-[78svh] w-auto max-w-full [mask-image:linear-gradient(to_bottom,black_55%,transparent_97%)] transition-opacity duration-300 select-none"
        style={{ opacity: showing ? 0 : 1 }}
      />
      {mode &&
        stage &&
        layout &&
        assets.depth &&
        assets.particles &&
        createPortal(
          <CinematicScene
            photoSrc={assets.photo}
            depthSrc={assets.depth}
            particlesSrc={assets.particles}
            playIntro={mode.playIntro}
            touch={mode.touch}
            tier={mode.tier}
            particleLimit={mode.touch ? POINTS_PHONE : POINTS_DESKTOP}
            layout={layout}
            rig={rig}
            skipSignal={skip}
            active={active}
            onPhase={onPhase}
          />,
          stage,
        )}
    </div>
  );
}
