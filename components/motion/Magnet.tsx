"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EASE_CSS_IN_OUT, EASE_CSS_OUT, gsap } from "@/lib/gsap";
import { magnetOffset } from "@/lib/motion/magnet";
import { useMotionEnabled } from "@/lib/motion/use-motion";

type MagnetProps = {
  children: ReactNode;
  className?: string;
  /** px around the element in which the pull is active */
  padding?: number;
  /** higher = weaker pull */
  strength?: number;
  /** seconds; template: 0.3 s ease-out while active */
  activeDuration?: number;
  /** seconds; template: 0.6 s ease-in-out on release */
  inactiveDuration?: number;
};

/** Mouse-following magnetic effect (GSAP port of the template's Magnet). */
export function Magnet({
  children,
  className,
  padding = 100,
  strength = 2,
  activeDuration = 0.3,
  inactiveDuration = 0.6,
}: MagnetProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !motion) return;

    let active = false;
    const onMove = (e: MouseEvent) => {
      const o = magnetOffset(
        outer.getBoundingClientRect(),
        e.clientX,
        e.clientY,
        padding,
        strength,
      );
      if (o.active) {
        active = true;
        gsap.to(inner, {
          x: o.x,
          y: o.y,
          duration: activeDuration,
          ease: EASE_CSS_OUT,
          overwrite: true,
        });
      } else if (active) {
        active = false;
        gsap.to(inner, {
          x: 0,
          y: 0,
          duration: inactiveDuration,
          ease: EASE_CSS_IN_OUT,
          overwrite: true,
        });
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      gsap.killTweensOf(inner);
      gsap.set(inner, { clearProps: "transform" });
    };
  }, [motion, padding, strength, activeDuration, inactiveDuration]);

  return (
    <div ref={outerRef} className={className}>
      <div ref={innerRef} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}
