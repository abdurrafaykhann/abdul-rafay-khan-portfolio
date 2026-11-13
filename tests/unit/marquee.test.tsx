import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollMarquee } from "@/components/motion/ScrollMarquee";
import {
  MAX_PLAYING,
  fillRows,
  marqueeOffset,
  pickPlaying,
  rowTranslateX,
  type MarqueeItem,
  type VisibleClip,
} from "@/lib/marquee";

const item = (n: number, type: MarqueeItem["type"] = "image"): MarqueeItem => ({
  id: `p${n}`,
  type,
  src: `/clip-${n}.${type === "video" ? "webm" : "webp"}`,
  poster: type === "video" ? `/poster-${n}.webp` : undefined,
  alt: `Project ${n}`,
});
const items = (count: number) =>
  Array.from({ length: count }, (_, i) => item(i));

describe("marquee scroll maths (template formula)", () => {
  it("offset = (scrollY - sectionTop + innerHeight) * 0.3", () => {
    expect(marqueeOffset(1000, 800, 900)).toBeCloseTo(330);
    expect(marqueeOffset(0, 900, 900)).toBe(0);
  });

  it("row 1 moves right by offset - 200, row 2 mirrors it", () => {
    expect(rowTranslateX(330, 0)).toBe(130);
    expect(rowTranslateX(330, 1)).toBe(-130);
    expect(rowTranslateX(0, 0)).toBe(-200);
    expect(rowTranslateX(0, 1)).toBe(200);
  });
});

describe("fillRows", () => {
  it("returns null when there are no clips (section is hidden)", () => {
    expect(fillRows([])).toBeNull();
  });

  it("splits 21 clips into rows of 11 and 10, in order", () => {
    const [row1, row2] = fillRows(items(21))!;
    expect(row1.map((i) => i.id)).toEqual(items(11).map((i) => i.id));
    expect(row2).toHaveLength(10);
    expect(row2[0].id).toBe("p11");
  });

  it("repeats clips to keep both rows full when there are fewer than 21", () => {
    const [row1, row2] = fillRows(items(4))!;
    expect(row1).toHaveLength(11);
    expect(row2).toHaveLength(10);
    expect(row1.map((i) => i.id).slice(0, 6)).toEqual([
      "p0",
      "p1",
      "p2",
      "p3",
      "p0",
      "p1",
    ]);
    // row 2 carries on the cycle rather than restarting it
    expect(row2[0].id).toBe("p3");
  });

  it("works with a single clip", () => {
    const [row1, row2] = fillRows(items(1))!;
    expect([...row1, ...row2].every((i) => i.id === "p0")).toBe(true);
  });

  it("drops extras beyond 21", () => {
    const [row1, row2] = fillRows(items(30))!;
    expect(row1.length + row2.length).toBe(21);
  });
});

describe("pickPlaying", () => {
  const viewport = { width: 1000, height: 800 };
  const clip = (key: string, centerX: number, centerY = 400): VisibleClip => ({
    key,
    centerX,
    centerY,
  });

  it("never allows more than 6 clips to play", () => {
    const visible = Array.from({ length: 14 }, (_, i) => clip(`c${i}`, i * 80));
    expect(MAX_PLAYING).toBe(6);
    expect(pickPlaying(visible, viewport)).toHaveLength(6);
  });

  it("prefers the clips closest to the middle of the screen", () => {
    const visible = [
      clip("edge-left", 10),
      clip("centre", 500),
      clip("near", 620),
      clip("edge-right", 990),
    ];
    expect(pickPlaying(visible, viewport, 2)).toEqual(["centre", "near"]);
  });

  it("plays everything visible when under the limit, nothing when empty", () => {
    expect(pickPlaying([clip("a", 100), clip("b", 300)], viewport)).toEqual([
      "b",
      "a",
    ]);
    expect(pickPlaying([], viewport)).toEqual([]);
  });
});

describe("ScrollMarquee", () => {
  it("renders nothing without clips", () => {
    const { container } = render(<ScrollMarquee items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders two rows of 33 and 30 tiles (11 and 10, tripled)", () => {
    const { container } = render(<ScrollMarquee items={items(5)} />);
    const rows = container.querySelectorAll("[data-marquee-row]");
    expect(rows).toHaveLength(2);
    expect(rows[0].children).toHaveLength(33);
    expect(rows[1].children).toHaveLength(30);
    expect(screen.getAllByAltText("Project 0").length).toBeGreaterThan(1);
  });

  it("videos are muted, looping, inline and do not load until played", () => {
    const { container } = render(
      <ScrollMarquee items={[item(0, "video"), item(1)]} />,
    );
    const video = container.querySelector("video")!;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("poster", "/poster-0.webp");
    // src is attached lazily, only when the clip is chosen to play
    expect(video).not.toHaveAttribute("src");
    expect(video.dataset.src).toBe("/clip-0.webm");
  });
});
