"use client";

import { Zap, ZapOff } from "lucide-react";
import { setPlainMode } from "@/lib/motion/prefs";
import { usePlainMode } from "@/lib/motion/use-motion";

/** Turns off all 3D and heavy motion. The choice is remembered. */
export function PlainModeToggle({ className = "" }: { className?: string }) {
  const plain = usePlainMode();
  const label = plain
    ? "Plain mode is on. Turn animations back on"
    : "Turn on plain mode (no animations or 3D)";

  return (
    <button
      type="button"
      aria-pressed={plain}
      aria-label={label}
      title={label}
      onClick={() => setPlainMode(!plain)}
      className={`text-mist inline-flex cursor-pointer items-center justify-center rounded-full transition-opacity duration-200 hover:opacity-70 ${className}`}
    >
      {plain ? (
        <ZapOff aria-hidden className="size-[1.25em]" />
      ) : (
        <Zap aria-hidden className="size-[1.25em]" />
      )}
    </button>
  );
}
