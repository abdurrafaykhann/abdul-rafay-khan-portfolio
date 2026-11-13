import { FadeIn } from "@/components/motion/FadeIn";
import { Magnet } from "@/components/motion/Magnet";
import { Navbar, type NavLink } from "@/components/sections/Navbar";
import { ContactButton } from "@/components/ui/ContactButton";
import { site } from "@/lib/site";

type HeroProps = {
  links: NavLink[];
  tagline: string;
  /** null until a photo exists: the hero then shows no portrait */
  portraitSrc: string | null;
};

export function Hero({ links, tagline, portraitSrc }: HeroProps) {
  return (
    <section
      id="top"
      className="relative flex h-svh flex-col"
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

      {portraitSrc && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 w-[280px] -translate-x-1/2 -translate-y-1/2 sm:top-auto sm:bottom-0 sm:w-[360px] sm:translate-y-0 md:w-[440px] lg:w-[520px]">
          <FadeIn delay={0.6} y={30}>
            <Magnet padding={150} strength={3}>
              {/* Plain <img>: intrinsic size is unknown until the photo pipeline (M7). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitSrc}
                alt={`Portrait of ${site.name}`}
                fetchPriority="high"
                decoding="async"
                draggable={false}
                className="block h-auto w-full select-none"
              />
            </Magnet>
          </FadeIn>
        </div>
      )}
    </section>
  );
}
