import type { Metadata } from "next";
import GalaxyView from "@/components/three/galaxy/GalaxyView";
import {
  CLUSTER_RADIUS,
  computeGalaxy,
  type GalaxyItem,
} from "@/lib/galaxy/positions";

export const metadata: Metadata = {
  title: "Galaxy (dev)",
  robots: { index: false },
};

/** Development only: the galaxy with made-up projects, to review the 3D view. */
const CATS = [
  { id: "cv", name: "Computer Vision", color: "#B600A8" },
  { id: "agents", name: "Agentic AI", color: "#4FC3F7" },
  { id: "auto", name: "AI Automations", color: "#BE4C00" },
  { id: "web", name: "Web", color: "#7CE08A" },
];

function vector(seed: number, axis: number) {
  const v = new Array(32).fill(0);
  v[axis] = 1;
  v[(seed * 5) % 32] += 0.5;
  v[(seed * 11 + 3) % 32] += 0.3;
  return v;
}

const projects = [
  ["Sentinel", "cv", "Recall: 79%"],
  ["Face ID", "cv", "Top-1: 97.7%"],
  ["Plate reader", "cv", null],
  ["DocSense", "agents", null],
  ["Research agent", "agents", null],
  ["Sweet Crumbs", "auto", "Saved: 12 h/week"],
  ["Lead router", "auto", null],
  ["Invoice bot", "auto", null],
  ["Portfolio", "web", null],
  ["Storefront", "web", "LCP: 1.2 s"],
] as const;

export default function GalaxyDevPage() {
  const items: GalaxyItem[] = projects.map(([title, cat], i) => ({
    id: title,
    categoryId: cat,
    vector: vector(i, CATS.findIndex((c) => c.id === cat) * 6),
  }));
  const pos = computeGalaxy(
    items,
    CATS.map((c) => c.id),
  );
  const nodes = projects.map(([title, cat, metric]) => {
    const c = CATS.find((x) => x.id === cat)!;
    const p = pos.get(title)!;
    return {
      id: title,
      title,
      href: "/dev/galaxy",
      color: c.color,
      category: c.name,
      metric,
      ...p,
    };
  });
  return (
    <main className="bg-ink min-h-svh p-6 text-[#D7E2EA]">
      <h1 className="mb-4 text-xl">Galaxy · cluster radius {CLUSTER_RADIUS}</h1>
      <GalaxyView
        nodes={nodes}
        legend={CATS.map((c) => ({ name: c.name, color: c.color }))}
      />
    </main>
  );
}
