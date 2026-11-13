export type MarqueeItem = {
  id: string;
  type: "image" | "video";
  /** image URL, or video URL (WebM/MP4) */
  src: string;
  /** still image shown until a video plays */
  poster?: string;
  alt: string;
};

/** Template values. */
export const ROW_SIZES = [11, 10] as const;
export const SCROLL_FACTOR = 0.3;
export const START_SHIFT = 200;
export const ROW_REPEATS = 3;
/** Never decode more than this many clips at once. */
export const MAX_PLAYING = 6;

/** Template: (window.scrollY - sectionTop + window.innerHeight) * 0.3 */
export function marqueeOffset(
  scrollY: number,
  sectionTop: number,
  innerHeight: number,
): number {
  return (scrollY - sectionTop + innerHeight) * SCROLL_FACTOR;
}

/** Row 1 moves right (offset - 200), row 2 moves left (-(offset - 200)). */
export function rowTranslateX(offset: number, row: 0 | 1): number {
  const x = offset - START_SHIFT;
  return row === 0 ? x : -x;
}

/**
 * Splits the clips into the template's two rows (11 + 10). With fewer than 21
 * clips they are repeated in order so both rows are always full; with more,
 * the extra ones are dropped. Returns null when there is nothing to show
 * (the section is then hidden).
 */
export function fillRows(
  items: MarqueeItem[],
): [MarqueeItem[], MarqueeItem[]] | null {
  if (items.length === 0) return null;
  const total = ROW_SIZES[0] + ROW_SIZES[1];
  const filled = Array.from(
    { length: total },
    (_, i) => items[i % items.length],
  );
  return [filled.slice(0, ROW_SIZES[0]), filled.slice(ROW_SIZES[0])];
}

export type VisibleClip = { key: string; centerX: number; centerY: number };

/**
 * Of the clips currently on screen, choose which may play: the `max` closest
 * to the middle of the viewport.
 */
export function pickPlaying(
  visible: VisibleClip[],
  viewport: { width: number; height: number },
  max: number = MAX_PLAYING,
): string[] {
  const cx = viewport.width / 2;
  const cy = viewport.height / 2;
  return [...visible]
    .sort(
      (a, b) =>
        Math.hypot(a.centerX - cx, a.centerY - cy) -
        Math.hypot(b.centerX - cx, b.centerY - cy),
    )
    .slice(0, Math.max(0, max))
    .map((clip) => clip.key);
}
