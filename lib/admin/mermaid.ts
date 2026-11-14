"use client";

/**
 * Renders a Mermaid diagram to SVG in the admin's browser (Mermaid needs a
 * DOM). It is loaded on demand, so it is never part of the public site, and
 * the resulting SVG is stored when the project is saved. Plain SVG text is
 * used (no HTML labels) so the diagram is a self-contained picture.
 */
export async function renderDiagram(
  source: string,
): Promise<{ ok: true; svg: string } | { ok: false; error: string }> {
  const code = source.trim();
  if (!code) return { ok: true, svg: "" };
  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      htmlLabels: false,
      flowchart: { htmlLabels: false, curve: "basis" },
      theme: "base",
      fontFamily: "Kanit, ui-sans-serif, system-ui, sans-serif",
      themeVariables: {
        background: "#0C0C0C",
        primaryColor: "#18011F",
        primaryTextColor: "#D7E2EA",
        primaryBorderColor: "#B600A8",
        secondaryColor: "#1b1230",
        secondaryBorderColor: "#7621B0",
        tertiaryColor: "#0C0C0C",
        lineColor: "#7621B0",
        textColor: "#D7E2EA",
        noteBkgColor: "#18011F",
        noteTextColor: "#D7E2EA",
        edgeLabelBackground: "#0C0C0C",
        clusterBkg: "#120c1a",
        clusterBorder: "#7621B0",
      },
    });
    const { svg } = await mermaid.render(`diagram-${Date.now()}`, code);
    return { ok: true, svg };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message.split("\n")[0].slice(0, 200) };
  }
}
