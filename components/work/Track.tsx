"use client";

import { useEffect, type ReactNode } from "react";

/** Fire-and-forget event (no cookies, no IP stored). */
function send(type: "view" | "click", projectId: string, target?: string) {
  try {
    const body = JSON.stringify({ type, projectId, target });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([body], { type: "application/json" }),
      );
    } else {
      void fetch("/api/track", { method: "POST", body, keepalive: true });
    }
  } catch {
    /* tracking must never break the page */
  }
}

/** Records one page view of a case study. */
export function TrackView({ projectId }: { projectId: string }) {
  useEffect(() => {
    send("view", projectId);
  }, [projectId]);
  return null;
}

/** External link that records a click (e.g. target "github"). */
export function TrackedLink({
  projectId,
  target,
  href,
  className,
  children,
}: {
  projectId: string;
  target: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => send("click", projectId, target)}
    >
      {children}
    </a>
  );
}
