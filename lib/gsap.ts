"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

/** Template FadeIn easing: cubic-bezier(0.25, 0.1, 0.25, 1). */
export const EASE_FADE = CustomEase.create("fade", "0.25,0.1,0.25,1");
/** CSS `ease-out` — Magnet active transition. */
export const EASE_CSS_OUT = CustomEase.create("cssOut", "0,0,0.58,1");
/** CSS `ease-in-out` — Magnet release transition. */
export const EASE_CSS_IN_OUT = CustomEase.create("cssInOut", "0.42,0,0.58,1");

export { gsap };
