/**
 * Checks a rendered Mermaid diagram before it is stored. The public page
 * shows it inside an <img> (where scripts never run), so this is a second
 * line of defence, not the only one.
 */
export const MAX_SVG_BYTES = 300_000;

export function checkSvg(
  svg: string,
): { ok: true; svg: string } | { ok: false; error: string } {
  const s = svg.trim();
  if (!s) return { ok: true, svg: "" };
  if (s.length > MAX_SVG_BYTES)
    return { ok: false, error: "The diagram is too large." };
  if (!/^<svg[\s>]/i.test(s) && !/^<\?xml[\s\S]*?<svg[\s>]/i.test(s)) {
    return { ok: false, error: "The diagram is not an SVG image." };
  }
  if (
    /<script|<foreignObject|<iframe|<object|<embed|javascript:|\son[a-z]+\s*=|<!ENTITY|<!DOCTYPE/i.test(
      s,
    )
  ) {
    return {
      ok: false,
      error: "The diagram contains something that is not allowed.",
    };
  }
  return { ok: true, svg: s };
}
