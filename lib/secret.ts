import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time comparison of a supplied secret against the expected one. */
export function secretMatches(
  supplied: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!supplied || !expected) return false;
  // hash first so both buffers always have the same length
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
