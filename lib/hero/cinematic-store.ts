import type { Tier } from "./config";

/**
 * Whether the cinematic scroll sequence is on, and at which tier. Set by the
 * portrait once the 3D scene may run; read by the hero track (which then
 * grows taller so the hero stays pinned while the sequence plays).
 */
let current: Tier | null = null;
const listeners = new Set<() => void>();

export const cinematicStore = {
  get: () => current,
  set(tier: Tier | null) {
    if (tier === current) return;
    current = tier;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
