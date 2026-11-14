"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The current year, read in the browser (a prerendered page can't know it). */
export function CurrentYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => String(new Date().getFullYear()),
    () => "",
  );
  return <span suppressHydrationWarning>{year}</span>;
}
