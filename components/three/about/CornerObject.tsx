"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useMotionEnabled } from "@/lib/motion/use-motion";
import type { AboutObjectKind } from "./objects";

// three.js is only downloaded when an object is about to scroll into view
const ObjectCanvas = dynamic(() => import("./ObjectCanvas"), { ssr: false });

/**
 * Decorative 3D object slot. Loads its canvas when near the viewport, stops
 * rendering when offscreen, and renders nothing in plain mode / reduced motion.
 */
export function CornerObject({ kind }: { kind: AboutObjectKind }) {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();
  const [near, setNear] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motion) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [motion]);

  return (
    <div
      ref={ref}
      aria-hidden
      data-about-object={kind}
      className="aspect-square w-full"
    >
      {motion && loaded && <ObjectCanvas kind={kind} active={near} />}
    </div>
  );
}
