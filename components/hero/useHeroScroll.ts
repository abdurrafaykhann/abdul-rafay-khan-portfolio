"use client";

import { useEffect, type RefObject } from "react";
import type { HeroRig } from "@/components/three/hero/world/world";
import { gsap } from "@/lib/gsap-scroll";

/**
 * The master scroll timeline for the cinematic hero. One scrubbed GSAP
 * timeline across the pinned track:
 *   - rig.p 0 → 1 drives the whole 3D scene (camera + every layer)
 *   - the scroll hint fades out as the sequence starts
 *   - the final line fades in for the final reveal
 * Scrubbing makes it reverse naturally; everything is reverted on cleanup.
 */
export function useHeroScroll(enabled: boolean, rig: RefObject<HeroRig>) {
  useEffect(() => {
    if (!enabled) return;
    const track = document.querySelector<HTMLElement>("[data-hero-track]");
    if (!track) return;
    const state = rig.current;

    const ctx = gsap.context(() => {
      gsap.set("[data-hero-scrollhint]", { opacity: 0.7 });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: track,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
        },
      });
      tl.fromTo(state, { p: 0 }, { p: 1, duration: 1 }, 0)
        .to("[data-hero-scrollhint]", { opacity: 0, duration: 0.06 }, 0.01)
        .fromTo(
          "[data-hero-final]",
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.14 },
          0.84,
        );
    }, track);

    return () => {
      ctx.revert();
      state.p = 0;
    };
  }, [enabled, rig]);
}
