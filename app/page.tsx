import { Hero } from "@/components/sections/Hero";
import type { NavLink } from "@/components/sections/Navbar";
import { getHeroPortrait } from "@/lib/hero-portrait";
import { site } from "@/lib/site";

// Sections land milestone by milestone; from M3 each link is shown only
// when its section has content.
const NAV_LINKS: NavLink[] = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Ask AI", href: "#ask-ai" },
  { label: "Contact", href: "#contact" },
];

export default function HomePage() {
  return (
    <main id="main" className="bg-ink" style={{ overflowX: "clip" }}>
      <Hero
        links={NAV_LINKS}
        tagline={site.defaultTagline}
        portraitSrc={getHeroPortrait()}
      />
    </main>
  );
}
