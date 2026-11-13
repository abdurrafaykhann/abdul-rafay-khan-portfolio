import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlainModeToggle } from "@/components/ui/PlainModeToggle";
import { magnetOffset } from "@/lib/motion/magnet";
import {
  MOTION_INIT_SCRIPT,
  PLAIN_MODE_KEY,
  computeMotionEnabled,
  readMotionEnabled,
  readPlainMode,
  setPlainMode,
} from "@/lib/motion/prefs";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("magnetOffset", () => {
  // 200x100 element centred on (200, 150)
  const rect = { left: 100, top: 100, width: 200, height: 100 };

  it("pulls towards the cursor by distance / strength (template: strength 3)", () => {
    expect(magnetOffset(rect, 230, 120, 150, 3)).toEqual({
      active: true,
      x: 10,
      y: -10,
    });
  });

  it("is active within the padding zone outside the element", () => {
    // 149 px right of the right edge (x = 300)
    expect(magnetOffset(rect, 449, 150, 150, 3).active).toBe(true);
  });

  it("releases to 0,0 beyond the padding zone", () => {
    expect(magnetOffset(rect, 451, 150, 150, 3)).toEqual({
      active: false,
      x: 0,
      y: 0,
    });
    expect(magnetOffset(rect, 200, 351, 150, 3).active).toBe(false);
  });

  it("has no pull at the exact centre", () => {
    expect(magnetOffset(rect, 200, 150, 150, 3)).toEqual({
      active: true,
      x: 0,
      y: 0,
    });
  });
});

describe("motion preferences", () => {
  it("allows motion only when neither plain mode nor reduced motion is on", () => {
    expect(computeMotionEnabled({ plain: false, reduced: false })).toBe(true);
    expect(computeMotionEnabled({ plain: true, reduced: false })).toBe(false);
    expect(computeMotionEnabled({ plain: false, reduced: true })).toBe(false);
    expect(computeMotionEnabled({ plain: true, reduced: true })).toBe(false);
  });

  it("respects the OS reduce-motion setting", () => {
    mockReducedMotion(true);
    expect(readMotionEnabled()).toBe(false);
    mockReducedMotion(false);
    expect(readMotionEnabled()).toBe(true);
  });

  it("setPlainMode persists the choice and updates the html classes", () => {
    mockReducedMotion(false);
    setPlainMode(true);
    expect(window.localStorage.getItem(PLAIN_MODE_KEY)).toBe("1");
    expect(readPlainMode()).toBe(true);
    expect(document.documentElement).toHaveClass("plain");
    expect(document.documentElement).not.toHaveClass("motion");

    setPlainMode(false);
    expect(readPlainMode()).toBe(false);
    expect(document.documentElement).not.toHaveClass("plain");
    expect(document.documentElement).toHaveClass("motion");
  });
});

describe("head init script", () => {
  const run = () => new Function(MOTION_INIT_SCRIPT)();

  it("enables motion by default", () => {
    mockReducedMotion(false);
    run();
    expect(document.documentElement).toHaveClass("motion");
    expect(document.documentElement).not.toHaveClass("plain");
  });

  it("keeps motion off for reduced motion", () => {
    mockReducedMotion(true);
    run();
    expect(document.documentElement).not.toHaveClass("motion");
  });

  it("restores plain mode before paint", () => {
    mockReducedMotion(false);
    window.localStorage.setItem(PLAIN_MODE_KEY, "1");
    run();
    expect(document.documentElement).toHaveClass("plain");
    expect(document.documentElement).not.toHaveClass("motion");
  });

  it("failsafe: reveals content if the app never hydrates", () => {
    vi.useFakeTimers();
    mockReducedMotion(false);
    window.__motionReady = false;
    run();
    expect(document.documentElement).toHaveClass("motion");
    vi.advanceTimersByTime(5000);
    expect(document.documentElement).not.toHaveClass("motion");
  });
});

describe("PlainModeToggle", () => {
  it("toggles plain mode and reflects it via aria-pressed", () => {
    mockReducedMotion(false);
    render(<PlainModeToggle />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveClass("plain");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).not.toHaveClass("plain");
  });
});
