import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MotionTip } from "@/components/ui/MotionTip";
import {
  MOTION_INIT_SCRIPT,
  MOTION_TIP_KEY,
  PLAIN_MODE_KEY,
  isPhone,
  readMotionEnabled,
  readPlainMode,
  setPlainMode,
} from "@/lib/motion/prefs";

/** Pretend to be a phone (touch screen, 390 px wide) or a desktop. */
function device(kind: "phone" | "tablet" | "desktop", reduced = false) {
  const coarse = kind !== "desktop";
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("reduced-motion")
        ? reduced
        : query.includes("pointer: coarse")
          ? coarse
          : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  const width = kind === "phone" ? 390 : kind === "tablet" ? 820 : 1440;
  vi.stubGlobal("screen", { width, height: kind === "desktop" ? 900 : 1180 });
  if (kind === "phone") vi.stubGlobal("screen", { width: 390, height: 844 });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.className = "";
});

describe("motion is off by default on phones only", () => {
  it("phone: plain mode on and no motion until the visitor turns it on", () => {
    device("phone");
    expect(isPhone()).toBe(true);
    expect(readPlainMode()).toBe(true);
    expect(readMotionEnabled()).toBe(false);
  });

  it("tablet and desktop keep motion on by default", () => {
    device("tablet");
    expect(isPhone()).toBe(false);
    expect(readMotionEnabled()).toBe(true);
    device("desktop");
    expect(isPhone()).toBe(false);
    expect(readMotionEnabled()).toBe(true);
  });

  it("a phone visitor who turns motion on keeps it on (and can turn it off again)", () => {
    device("phone");
    setPlainMode(false);
    expect(window.localStorage.getItem(PLAIN_MODE_KEY)).toBe("0");
    expect(readPlainMode()).toBe(false);
    expect(readMotionEnabled()).toBe(true);
    expect(document.documentElement).toHaveClass("motion");
    setPlainMode(true);
    expect(readMotionEnabled()).toBe(false);
  });

  it("an explicit choice always wins over the default", () => {
    device("desktop");
    window.localStorage.setItem(PLAIN_MODE_KEY, "1");
    expect(readPlainMode()).toBe(true);
    device("phone");
    window.localStorage.setItem(PLAIN_MODE_KEY, "0");
    expect(readPlainMode()).toBe(false);
  });

  it("the pre-paint script applies the same default (plain on phones, no flash)", () => {
    const run = (stored: string | null, phone: boolean) => {
      document.documentElement.className = "";
      if (stored !== null) window.localStorage.setItem(PLAIN_MODE_KEY, stored);
      else window.localStorage.removeItem(PLAIN_MODE_KEY);
      device(phone ? "phone" : "desktop");
      new Function(MOTION_INIT_SCRIPT)();
      return [...document.documentElement.classList];
    };
    expect(run(null, true)).toContain("plain");
    expect(run(null, true)).not.toContain("motion");
    expect(run("0", true)).toContain("motion");
    expect(run(null, false)).toContain("motion");
    expect(run("1", false)).toContain("plain");
  });
});

describe("MotionTip", () => {
  const tip = () => document.querySelector("[data-motion-tip]");

  it("appears briefly on a phone, then goes away by itself and is not shown again", () => {
    device("phone");
    const { unmount } = render(<MotionTip />);
    expect(tip()).toBeNull(); // not there at first

    act(() => void vi.advanceTimersByTime(1600));
    expect(tip()).not.toBeNull();
    expect(screen.getByText(/turn on the 3D motion/i)).toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(9000));
    expect(tip()).toBeNull();
    expect(window.localStorage.getItem(MOTION_TIP_KEY)).toBe("1");

    unmount();
    render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(tip()).toBeNull(); // seen once: never again
  });

  it("can be dismissed", () => {
    device("phone");
    render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(1600));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss tip" }));
    expect(tip()).toBeNull();
    expect(window.localStorage.getItem(MOTION_TIP_KEY)).toBe("1");
  });

  it("goes away when the visitor uses the toggle", () => {
    device("phone");
    render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(1600));
    expect(tip()).not.toBeNull();
    act(() => setPlainMode(false));
    expect(tip()).toBeNull();
  });

  it("never shows on desktop, tablets, after a saved choice, or with OS reduced motion", () => {
    device("desktop");
    const a = render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(tip()).toBeNull();
    a.unmount();

    device("tablet");
    const b = render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(tip()).toBeNull();
    b.unmount();

    device("phone");
    window.localStorage.setItem(PLAIN_MODE_KEY, "1");
    const c = render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(tip()).toBeNull();
    c.unmount();

    window.localStorage.clear();
    device("phone", true);
    render(<MotionTip />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(tip()).toBeNull(); // the OS setting would override the toggle anyway
  });
});
