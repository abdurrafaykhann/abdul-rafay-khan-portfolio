import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlainModeToggle } from "@/components/ui/PlainModeToggle";
import { CaseStudy } from "@/components/work/CaseStudy";
import { getContent, getPublishedSlugs } from "@/lib/data/content";
import { findProject } from "@/lib/data/select";
import { creativeWorkJsonLd, jsonLd, projectDescription } from "@/lib/seo";
import { site } from "@/lib/site";
import { siteUrl } from "@/lib/site-url";

/** Pages for the published projects are built ahead of time; new ones are
 *  generated the first time they are visited and cached. */
export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  // Next.js needs at least one entry; this placeholder renders a 404.
  return (slugs.length ? slugs : ["_"]).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { content } = await getContent();
  const p = findProject(content, slug);
  if (!p) return { title: "Project not found", robots: { index: false } };
  const url = `${siteUrl()}/work/${p.slug}`;
  const description = projectDescription(p);
  return {
    title: `${p.title} — ${site.shortName}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: p.title,
      description,
      siteName: site.name,
    },
    twitter: { card: "summary_large_image", title: p.title, description },
  };
}

async function Project({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { content } = await getContent();
  const project = findProject(content, slug);
  if (!project) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd(creativeWorkJsonLd(project)),
        }}
      />
      <CaseStudy project={project} content={content} />
    </>
  );
}

export default function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="bg-ink min-h-svh">
      <header className="text-mist fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-6 text-sm font-medium tracking-wider uppercase md:px-10 md:pt-8 md:text-lg">
        <Link
          href="/"
          className="font-bold transition-opacity hover:opacity-70"
        >
          {site.shortName}
        </Link>
        <Link href="/#work" className="transition-opacity hover:opacity-70">
          ← All work
        </Link>
        <PlainModeToggle />
      </header>
      <main id="main" style={{ overflowX: "clip" }}>
        <Suspense fallback={<div className="min-h-svh" />}>
          <Project params={params} />
        </Suspense>
      </main>
    </div>
  );
}
