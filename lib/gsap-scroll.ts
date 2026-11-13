"use client";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "@/lib/gsap";

gsap.registerPlugin(ScrollTrigger);

// ScrollTrigger measures positions once. When the page height changes later
// (media loading, sections appearing), re-measure so scroll animations stay
// lined up with their elements.
if (typeof window !== "undefined" && "ResizeObserver" in window) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastHeight = 0;
  new ResizeObserver(() => {
    const height = document.body.scrollHeight;
    if (height === lastHeight) return;
    lastHeight = height;
    clearTimeout(timer);
    timer = setTimeout(() => ScrollTrigger.refresh(), 150);
  }).observe(document.body);
}

export { gsap, ScrollTrigger };
