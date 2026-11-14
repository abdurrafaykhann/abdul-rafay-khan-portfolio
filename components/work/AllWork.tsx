"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import {
  WorkGrid,
  type GridCategory,
  type GridProject,
} from "@/components/work/WorkGrid";
import type { GalaxyLegendItem, GalaxyNode } from "@/lib/galaxy/nodes";
import { canRun3D, detectDevice } from "@/lib/hero/intro";
import { useMotionEnabled } from "@/lib/motion/use-motion";

const GalaxyView = dynamic(
  () => import("@/components/three/galaxy/GalaxyView"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        className="grid h-[68svh] min-h-[420px] place-items-center rounded-[28px] border-2 border-[#D7E2EA]/30 text-[#D7E2EA]/60"
      >
        Loading galaxy…
      </div>
    ),
  },
);

let deviceOk: boolean | null = null;
const noSubscribe = () => () => {};
/** WebGL available and not a low-end or data-saver device (checked once). */
function useDeviceOk(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => (deviceOk ??= canRun3D(detectDevice())),
    () => false,
  );
}

const btn = (on: boolean) =>
  `cursor-pointer rounded-full px-5 py-2 text-sm font-medium tracking-widest uppercase transition-colors ${
    on ? "bg-[#D7E2EA] text-[#0C0C0C]" : "text-[#D7E2EA] hover:bg-[#D7E2EA]/10"
  }`;

/**
 * "All work": the filterable grid, plus (when there is something to show and
 * the device can run it) an alternative 3D galaxy view of the same projects.
 * Plain mode, reduced motion and low-end devices only ever see the grid.
 */
export function AllWork({
  projects,
  categories,
  nodes,
  legend,
}: {
  projects: GridProject[];
  categories: GridCategory[];
  nodes: GalaxyNode[];
  legend: GalaxyLegendItem[];
}) {
  const motion = useMotionEnabled();
  const deviceReady = useDeviceOk();
  const [view, setView] = useState<"grid" | "galaxy">("grid");
  const canGalaxy = nodes.length > 0 && motion && deviceReady;
  const showGalaxy = canGalaxy && view === "galaxy";

  return (
    <div>
      {canGalaxy && (
        <div
          role="group"
          aria-label="Choose a view"
          className="mx-auto mb-8 flex w-fit gap-1 rounded-full border-2 border-[#D7E2EA]/40 p-1"
        >
          <button
            type="button"
            aria-pressed={view === "grid"}
            className={btn(view === "grid")}
            onClick={() => setView("grid")}
          >
            Grid
          </button>
          <button
            type="button"
            aria-pressed={view === "galaxy"}
            className={btn(view === "galaxy")}
            onClick={() => setView("galaxy")}
          >
            Galaxy
          </button>
        </div>
      )}
      {showGalaxy ? (
        <GalaxyView nodes={nodes} legend={legend} />
      ) : (
        <WorkGrid projects={projects} categories={categories} />
      )}
    </div>
  );
}
