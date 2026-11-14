import {
  HeroPortrait,
  type PortraitAssets,
} from "@/components/hero/HeroPortrait";
import { HeroTrack } from "@/components/hero/HeroTrack";
import { FadeIn } from "@/components/motion/FadeIn";
import { Magnet } from "@/components/motion/Magnet";
import { Navbar, type NavLink } from "@/components/sections/Navbar";
import { ContactButton } from "@/components/ui/ContactButton";
import { site } from "@/lib/site";

type HeroProps = {
  links: NavLink[];
  tagline: string;
  /** null until a photo exists: the hero then shows no portrait */
  portrait: PortraitAssets | null;
};

export function Hero({ links, tagline, portrait }: HeroProps) {
  return (
    <HeroTrack>
      <section
        id="top"
        // sticky: stays pinned while the (taller) track scrolls past during the
        // cinematic sequence; with a normal-height track it behaves as before
        className="sticky top-0 flex h-svh flex-col"
        style={{ overflowX: "clip" }}
      >
        <FadeIn as="header" delay={0} y={-20} className="relative z-20">
          <Navbar links={links} />
        </FadeIn>

        <div className="overflow-hidden">
          <FadeIn delay={0.15} y={40}>
            <h1 className="hero-heading hero-heading-size mt-6 w-full text-center leading-none font-black tracking-tight whitespace-nowrap uppercase sm:mt-4 md:-mt-5">
              Hi, i&rsquo;m {site.shortName}
            </h1>
          </FadeIn>
        </div>

        <div className="relative z-20 mt-auto flex items-end justify-between px-6 pb-7 sm:pb-8 md:px-10 md:pb-10">
          <FadeIn delay={0.35} y={20}>
            <p
              className="text-mist max-w-[160px] leading-snug font-light tracking-wide uppercase sm:max-w-[220px] md:max-w-[260px]"
              style={{ fontSize: "clamp(0.75rem, 1.4vw, 1.5rem)" }}
            >
              {tagline}
            </p>
          </FadeIn>
          <FadeIn delay={0.5} y={20}>
            <ContactButton />
          </FadeIn>
        </div>

        {/* The cinematic 3D scene is mounted here (above the heading, below
          the navbar and bottom bar), filling the hero. */}
        <div
          id="hero-stage"
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
        />

        {/* Final reveal line and scroll hint: shown only by the scroll timeline */}
        <p
          data-hero-final
          className="text-mist pointer-events-none absolute inset-x-0 bottom-24 z-20 px-6 text-center text-[0.65rem] leading-relaxed font-medium tracking-[0.3em] uppercase opacity-0 sm:bottom-28 sm:text-sm md:bottom-32"
        >
          AI Engineering <span className="text-[#B600A8]">×</span> Agentic AI{" "}
          <span className="text-[#BE4C00]">×</span> Full-Stack Development
        </p>
        <span
          data-hero-scrollhint
          aria-hidden
          className="text-mist pointer-events-none absolute inset-x-0 bottom-3 z-20 text-center text-[0.6rem] tracking-[0.4em] uppercase opacity-0 sm:bottom-4"
        >
          Scroll
        </span>

        {portrait && (
          <div
            data-hero-portrait-slot
            className="pointer-events-none absolute top-1/2 left-1/2 z-10 w-[280px] -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:bottom-0 sm:w-[360px] sm:translate-y-0 md:w-[440px] lg:w-[520px]"
          >
            <FadeIn delay={0.6} y={30}>
              <Magnet padding={150} strength={3}>
                <HeroPortrait
                  assets={portrait}
                  alt={`Portrait of ${site.name}`}
                />
              </Magnet>
            </FadeIn>
          </div>
        )}
      </section>
    </HeroTrack>
  );
}
