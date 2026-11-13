import { Suspense } from "react";
import { DraftBanner } from "@/components/DraftBanner";
import { ScrollMarquee } from "@/components/motion/ScrollMarquee";
import { About } from "@/components/sections/About";
import { Hero } from "@/components/sections/Hero";
import { WhatIDo } from "@/components/sections/WhatIDo";
import { Work } from "@/components/sections/Work";
import { getContent } from "@/lib/data/content";
import {
  filterCategories,
  marqueeItems,
  navLinks,
  visibleSections,
  whatIDoCategories,
} from "@/lib/data/select";
import { getHeroPortrait } from "@/lib/hero-portrait";
import { site } from "@/lib/site";

/**
 * The content-driven page sits inside <Suspense> (Next.js 16 Cache Components
 * rule). Its data is cached, so it is normally part of the prerendered page;
 * the fallback — the hero alone — only shows while a fresh copy loads.
 */
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="bg-ink" style={{ overflowX: "clip" }}>
          <Hero
            links={[]}
            tagline={site.defaultTagline}
            portraitSrc={getHeroPortrait()}
          />
        </main>
      }
    >
      <Home />
    </Suspense>
  );
}

async function Home() {
  const { content } = await getContent();
  // A section with no content is not rendered at all (and loses its nav link).
  const show = visibleSections(content);

  return (
    <main id="main" className="bg-ink" style={{ overflowX: "clip" }}>
      <Hero
        links={navLinks(show)}
        tagline={content.site.heroTagline ?? site.defaultTagline}
        portraitSrc={getHeroPortrait()}
      />
      {show.marquee && <ScrollMarquee items={marqueeItems(content)} />}
      {show.about && <About text={content.site.aboutText!} />}
      {show.whatIDo && (
        <WhatIDo
          categories={whatIDoCategories(content)}
          linkableSlugs={
            show.work ? filterCategories(content).map((c) => c.slug) : []
          }
        />
      )}
      {show.work && <Work content={content} overlap={show.whatIDo} />}
      <Suspense fallback={null}>
        <DraftBanner />
      </Suspense>
    </main>
  );
}
