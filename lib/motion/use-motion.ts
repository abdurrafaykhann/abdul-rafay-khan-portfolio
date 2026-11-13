"use client";

import { useSyncExternalStore } from "react";
import {
  readMotionEnabled,
  readPlainMode,
  subscribeMotionPrefs,
} from "./prefs";

/** True when animations and 3D may run (not plain mode, not reduced motion). */
export function useMotionEnabled(): boolean {
  return useSyncExternalStore(
    subscribeMotionPrefs,
    readMotionEnabled,
    () => false,
  );
}

export function usePlainMode(): boolean {
  return useSyncExternalStore(subscribeMotionPrefs, readPlainMode, () => false);
}
