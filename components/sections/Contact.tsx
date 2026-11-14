import { FadeIn } from "@/components/motion/FadeIn";
import { ContactForm } from "@/components/sections/ContactForm";
import { CurrentYear } from "@/components/sections/CurrentYear";
import type { SiteSettings } from "@/lib/data/types";
import { site } from "@/lib/site";

const link =
  "text-mist inline-block rounded-full border-2 border-[#D7E2EA] px-6 py-2.5 text-sm font-medium tracking-widest uppercase transition-colors duration-200 hover:bg-[#D7E2EA]/10";

/**
 * Contact + footer. Each link appears only when it exists; the section
 * itself only when there is something to show.
 */
export function Contact({ settings }: { settings: SiteSettings }) {
  const { email, linkedin, github } = settings.socials;
  return (
    <section
      id="contact"
      className="bg-ink px-5 pt-20 pb-10 sm:px-8 sm:pt-24 md:px-10 md:pt-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading mb-12 text-center leading-none font-black tracking-tight uppercase sm:mb-16 md:mb-20"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          Contact
        </h2>
      </FadeIn>

      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <FadeIn delay={0.1} className="flex flex-col gap-6">
          <p
            className="text-mist leading-relaxed font-light"
            style={{ fontSize: "clamp(1.05rem, 2vw, 1.5rem)" }}
          >
            Have a project, a role or a question? Send a message and I&rsquo;ll
            get back to you.
          </p>
          {email && (
            <a
              href={`mailto:${email}`}
              className="text-mist w-fit text-lg underline underline-offset-4 hover:opacity-75 sm:text-xl"
            >
              {email}
            </a>
          )}
          <div className="flex flex-wrap gap-3">
            {linkedin && (
              <a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                LinkedIn
              </a>
            )}
            {github && (
              <a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                GitHub
              </a>
            )}
            {settings.resumeUrl && (
              <a
                href={settings.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                Resume (PDF)
              </a>
            )}
          </div>
        </FadeIn>
        <FadeIn delay={0.2}>
          <ContactForm />
        </FadeIn>
      </div>

      <footer className="text-mist mx-auto mt-20 flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-[#D7E2EA]/15 pt-6 text-xs tracking-widest uppercase opacity-70 sm:mt-28">
        <span>
          © <CurrentYear /> {site.name}
        </span>
        <a href="#top" className="hover:opacity-70">
          Back to top ↑
        </a>
      </footer>
    </section>
  );
}
