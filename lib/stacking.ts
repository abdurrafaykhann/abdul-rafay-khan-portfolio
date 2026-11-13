/** Sticky stacking cards — the template's maths. */

/** Each card sits 28px lower than the one before it. */
export const STACK_OFFSET_PX = 28;

/** targetScale = 1 - (totalCards - 1 - index) * 0.03 */
export function targetScale(index: number, total: number): number {
  return 1 - (total - 1 - index) * 0.03;
}

/**
 * Scale of card `index` at overall stack scroll progress (0..1).
 * Card i starts shrinking at progress i/total and reaches its target at 1
 * (Framer's useTransform(progress, [i / total, 1], [1, targetScale])).
 */
export function cardScale(
  progress: number,
  index: number,
  total: number,
): number {
  if (total <= 0) return 1;
  const start = index / total;
  const t = Math.min(1, Math.max(0, (progress - start) / (1 - start)));
  return 1 + (targetScale(index, total) - 1) * t;
}
