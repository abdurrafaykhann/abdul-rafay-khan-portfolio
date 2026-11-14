import type { Project, SiteContent } from "@/lib/data/types";
import { chunkMarkdown } from "./chunk";

/**
 * Turns published site content into knowledge-base documents.
 *
 * Privacy rules (tested):
 *  - only published projects (the caller loads published content only);
 *  - a hidden client's name never appears: it is replaced with
 *    "a client in {industry}", including inside free-text written by the admin;
 *  - only traction marked show-public;
 *  - no employers or experience (the site has none).
 */

export type KbDocument = {
  sourceType: "project" | "category" | "about" | "skills" | "education";
  sourceId: string;
  sourceUrl: string | null;
  title: string;
  chunks: string[];
};

export type BuildOptions = {
  /** Raw client names that must not appear (from projects with a hidden client). */
  hiddenClientNames?: { name: string; industry: string | null }[];
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function scrubNames(
  text: string,
  hidden: BuildOptions["hiddenClientNames"] = [],
): string {
  let out = text;
  for (const h of hidden) {
    const name = h.name.trim();
    if (name.length < 2) continue;
    out = out.replace(
      new RegExp(escapeRe(name), "gi"),
      h.industry ? `a client in ${h.industry}` : "a client",
    );
  }
  return out;
}

function projectMarkdown(
  p: Project,
  categoryNames: Map<string, string>,
): string {
  const lines: string[] = [];
  const add = (label: string, value: string | null | undefined) => {
    if (value && value.trim()) lines.push(`${label}: ${value.trim()}`);
  };
  add("Summary", p.shortDesc);
  add("Status", p.status.replace("_", " "));
  const cats = p.categoryIds.map((id) => categoryNames.get(id)).filter(Boolean);
  if (cats.length) add("Categories", cats.join(", "));
  if (p.tech.length) add("Technology", p.tech.join(", "));
  add("My role", p.myRole);
  if (p.clientName) add("Client", p.clientName);
  else if (p.industry) add("Client", `a client in ${p.industry}`);
  add("Industry", p.industry);
  add("Automation trigger", p.automationTrigger);
  if (p.apps.length) add("Apps connected", p.apps.join(", "));
  add("Savings", p.savingsText);
  add("Product", p.productName);
  add("What it offers", p.valueProp);
  add("Stage", p.stage);
  if (p.features.length) add("Features", p.features.join("; "));
  if (p.metrics.length)
    add("Results", p.metrics.map((m) => `${m.label}: ${m.value}`).join("; "));
  const traction = p.traction.filter((t) => t.showPublic);
  if (traction.length)
    add(
      "Traction",
      traction
        .map(
          (t) => `${t.label}: ${t.value}${t.asOf ? ` (as of ${t.asOf})` : ""}`,
        )
        .join("; "),
    );
  if (p.trainedVsIntegrated.length)
    add(
      "Trained vs integrated",
      p.trainedVsIntegrated
        .map(
          (r) =>
            `${r.component} — ${r.kind}${r.sourceModel ? ` (${r.sourceModel})` : ""}${r.evaluation ? `: ${r.evaluation}` : ""}`,
        )
        .join("; "),
    );
  if (p.changelog.length)
    add("Changelog", p.changelog.map((c) => `${c.date}: ${c.note}`).join("; "));
  return `${lines.join("\n")}\n\n${p.caseStudyMd ?? ""}`.trim();
}

export function buildDocuments(
  content: SiteContent,
  { hiddenClientNames = [] }: BuildOptions = {},
): KbDocument[] {
  const docs: KbDocument[] = [];
  const push = (d: Omit<KbDocument, "chunks"> & { md: string }) => {
    const chunks = chunkMarkdown(d.title, scrubNames(d.md, hiddenClientNames));
    if (chunks.length)
      docs.push({
        sourceType: d.sourceType,
        sourceId: d.sourceId,
        sourceUrl: d.sourceUrl,
        title: d.title,
        chunks,
      });
  };

  const categoryNames = new Map(content.categories.map((c) => [c.id, c.name]));

  for (const p of content.projects) {
    if (!p.published) continue;
    push({
      sourceType: "project",
      sourceId: p.id,
      sourceUrl: `/work/${p.slug}`,
      title: p.title,
      md: projectMarkdown(p, categoryNames),
    });
  }

  for (const c of content.categories) {
    if (!c.showInWhatIDo) continue;
    const md = [
      c.description,
      c.stack.length ? `Stack: ${c.stack.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    push({
      sourceType: "category",
      sourceId: c.id,
      sourceUrl: "/#what-i-do",
      title: c.name,
      md,
    });
  }

  if (content.site.aboutText) {
    push({
      sourceType: "about",
      sourceId: "about",
      sourceUrl: "/#about",
      title: "About Abdul Rafay Khan",
      md: content.site.aboutText,
    });
  }

  if (content.site.skills.length) {
    push({
      sourceType: "skills",
      sourceId: "skills",
      sourceUrl: "/#education",
      title: "Skills",
      md: content.site.skills
        .map((g) => `${g.group}: ${g.items.join(", ")}`)
        .join("\n"),
    });
  }

  for (const e of content.education) {
    const md = [
      e.institution && `Institution: ${e.institution}`,
      (e.start || e.end) &&
        `Years: ${[e.start, e.end].filter(Boolean).join(" – ")}`,
      e.grade && `Grade: ${e.grade}`,
      e.description,
    ]
      .filter(Boolean)
      .join("\n");
    push({
      sourceType: "education",
      sourceId: e.id,
      sourceUrl: "/#education",
      title: e.qualification || "Education",
      md,
    });
  }

  return docs;
}
