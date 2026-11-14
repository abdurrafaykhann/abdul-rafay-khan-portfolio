import type { Project } from "@/lib/data/types";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/site-url";

/** JSON for a <script type="application/ld+json">, safe to inline. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function personJsonLd(opts: {
  linkedin?: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: "AI Engineer and Full-Stack Developer",
    url: siteUrl(),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.linkedin ? { sameAs: [opts.linkedin] } : {}),
  };
}

export function creativeWorkJsonLd(p: Project) {
  const url = `${siteUrl()}/work/${p.slug}`;
  const image =
    p.images.right ?? p.images.leftTop ?? p.marqueePoster ?? undefined;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: p.title,
    url,
    ...(p.shortDesc ? { description: p.shortDesc } : {}),
    ...(image && /^https?:\/\//.test(image) ? { image } : {}),
    ...(p.tech.length ? { keywords: p.tech.join(", ") } : {}),
    ...(p.startedOn ? { dateCreated: p.startedOn } : {}),
    author: { "@type": "Person", name: site.name, url: siteUrl() },
  };
}

/** Description for search results and link previews. */
export function projectDescription(p: Project): string {
  const base = p.shortDesc || `${p.title}, a project by ${site.name}.`;
  return base.length > 200 ? `${base.slice(0, 197)}…` : base;
}
