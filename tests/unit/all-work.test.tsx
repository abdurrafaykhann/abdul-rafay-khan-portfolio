import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { motion: true, device: true };

vi.mock("@/lib/motion/use-motion", () => ({
  useMotionEnabled: () => state.motion,
}));
vi.mock("@/lib/hero/intro", () => ({
  detectDevice: () => ({ webgl: state.device }),
  canRun3D: (d: { webgl: boolean }) => d.webgl,
}));
vi.mock("@/components/three/galaxy/GalaxyView", () => ({
  default: () => <div data-testid="galaxy" />,
}));
vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="galaxy" />,
}));
vi.mock("@/components/work/WorkGrid", () => ({
  WorkGrid: () => <div data-testid="grid" />,
}));

const nodes = [
  {
    id: "a",
    title: "A",
    href: "/work/a",
    color: "#fff",
    category: "CV",
    metric: null,
    x: 0,
    y: 0,
    z: 0,
  },
];

async function load() {
  vi.resetModules();
  const { AllWork } = await import("@/components/work/AllWork");
  return AllWork;
}

beforeEach(() => {
  state.motion = true;
  state.device = true;
});

describe("AllWork", () => {
  it("shows the grid by default, with a Grid / Galaxy toggle", async () => {
    const AllWork = await load();
    render(<AllWork projects={[]} categories={[]} nodes={nodes} legend={[]} />);
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grid" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches to the galaxy and back", async () => {
    const AllWork = await load();
    render(<AllWork projects={[]} categories={[]} nodes={nodes} legend={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Galaxy" }));
    expect(screen.getByTestId("galaxy")).toBeInTheDocument();
    expect(screen.queryByTestId("grid")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Grid" }));
    expect(screen.getByTestId("grid")).toBeInTheDocument();
  });

  it("has no toggle in plain mode or with reduced motion", async () => {
    state.motion = false;
    const AllWork = await load();
    render(<AllWork projects={[]} categories={[]} nodes={nodes} legend={[]} />);
    expect(screen.queryByRole("button", { name: "Galaxy" })).toBeNull();
    expect(screen.getByTestId("grid")).toBeInTheDocument();
  });

  it("has no toggle on a low-end device", async () => {
    state.device = false;
    const AllWork = await load();
    render(<AllWork projects={[]} categories={[]} nodes={nodes} legend={[]} />);
    expect(screen.queryByRole("button", { name: "Galaxy" })).toBeNull();
  });

  it("has no toggle when no project has a position yet", async () => {
    const AllWork = await load();
    render(<AllWork projects={[]} categories={[]} nodes={[]} legend={[]} />);
    expect(screen.queryByRole("button", { name: "Galaxy" })).toBeNull();
    expect(screen.getByTestId("grid")).toBeInTheDocument();
  });
});
