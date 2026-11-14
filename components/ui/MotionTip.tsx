"use client";

import { X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  MOTION_PREF_EVENT,
  MOTION_TIP_KEY,
  isPhone,
  readReducedMotion,
  readStoredPlain,
  subscribeMotionPrefs,
} from "@/lib/motion/prefs";

const SHOW_AFTER_MS = 1500;
const HIDE_AFTER_MS = 10000;

function tipSeen(): boolean {
  try {
    return window.localStorage.getItem(MOTION_TIP_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(MOTION_TIP_KEY, "1");
  } catch {
    /* fine: the tip may show again next visit */
  }
  window.dispatchEvent(new Event(MOTION_PREF_EVENT));
}

/** Phone, motion off by default (the visitor never chose), tip not shown before. */
function eligible(): boolean {
  return (
    isPhone() &&
    !readReducedMotion() &&
    readStoredPlain() === null &&
    !tipSeen()
  );
}

/**
 * A short tip for phones, where motion and 3D start switched off: it points at
 * the bolt button and says how to turn them on. It is not part of the layout:
 * it appears briefly, then goes away by itself and is not shown again. Using
 * the toggle (or closing the tip) also ends it.
 */
export function MotionTip() {
  const canShow = useSyncExternalStore(
    subscribeMotionPrefs,
    eligible,
    () => false,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShow) return;
    const show = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    const hide = window.setTimeout(() => {
      setVisible(false);
      markSeen();
    }, HIDE_AFTER_MS);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [canShow]);

  if (!canShow || !visible) return null;

  return (
    <div
      role="status"
      data-motion-tip
      className="absolute top-full right-0 z-30 mt-3 w-max max-w-[220px] normal-case"
    >
      {/* little arrow pointing up at the bolt */}
      <span
        aria-hidden
        className="absolute -top-1.5 right-2 size-3 rotate-45 border-t border-l border-[#D7E2EA]/40 bg-[#0C0C0C]"
      />
      <div className="flex items-start gap-2 rounded-2xl border border-[#D7E2EA]/40 bg-[#0C0C0C]/95 py-2.5 pr-2 pl-3.5 text-xs leading-snug font-normal tracking-normal text-[#D7E2EA] shadow-lg backdrop-blur">
        <p>Tap the bolt to turn on the 3D motion.</p>
        <button
          type="button"
          aria-label="Dismiss tip"
          onClick={markSeen}
          className="-mt-0.5 shrink-0 cursor-pointer rounded-full p-1 opacity-70 hover:opacity-100"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
