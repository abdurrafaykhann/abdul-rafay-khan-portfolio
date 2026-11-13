"use client";

import { useEffect } from "react";
import { applyToDocument } from "@/lib/motion/prefs";

declare global {
  interface Window {
    __motionReady?: boolean;
  }
}

/** Tells the head failsafe script that the app hydrated; re-syncs html classes. */
export function MotionReady() {
  useEffect(() => {
    window.__motionReady = true;
    applyToDocument();
  }, []);
  return null;
}
