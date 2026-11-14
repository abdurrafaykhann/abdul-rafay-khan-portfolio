"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cinematicStore } from "@/lib/hero/cinematic-store";

/**
 * The scroll track around the hero. Normally exactly as tall as the hero.
 * While the cinematic sequence is on it is taller, and the sticky hero
 * inside stays pinned to the screen for that extra distance.
 */
export function HeroTrack({ children }: { children: ReactNode }) {
  const tier = useSyncExternalStore(
    cinematicStore.subscribe,
    cinematicStore.get,
    () => null,
  );
  return (
    <div
      data-hero-track={tier ? tier.name : "static"}
      style={tier ? { height: `calc(100svh + ${tier.travel}svh)` } : undefined}
    >
      {children}
    </div>
  );
}
