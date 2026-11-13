export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MagnetOffset = { active: boolean; x: number; y: number };

/**
 * Magnetic hover maths (same behaviour as the template's Magnet):
 * the element is "active" while the cursor is within `padding` px of its
 * edges, and is pulled towards the cursor by (distance from centre / strength).
 */
export function magnetOffset(
  rect: RectLike,
  clientX: number,
  clientY: number,
  padding: number,
  strength: number,
): MagnetOffset {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const distX = Math.abs(centerX - clientX);
  const distY = Math.abs(centerY - clientY);

  const active =
    distX < rect.width / 2 + padding && distY < rect.height / 2 + padding;
  if (!active) return { active: false, x: 0, y: 0 };

  return {
    active: true,
    x: (clientX - centerX) / strength,
    y: (clientY - centerY) / strength,
  };
}
