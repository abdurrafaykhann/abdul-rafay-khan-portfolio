import { FadeIn } from "@/components/motion/FadeIn";
import type { EducationEntry, SkillGroup } from "@/lib/data/types";

const RADIUS = "rounded-[32px] sm:rounded-[40px] md:rounded-[48px]";

function Photo({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${RADIUS} w-full object-cover ${className ?? ""}`}
    />
  );
}

/**
 * Education & Skills, in the template's visual language (dark section,
 * gradient heading, numbered rows). The featured entry's photo of Rafay and
 * photo of the degree headline the section; each block renders only when it
 * has content.
 */
export function Education({
  entries,
  featured,
  skills,
  overlap = false,
}: {
  entries: EducationEntry[];
  featured: EducationEntry | null;
  skills: SkillGroup[];
  /** true when the white "What I do" section sits directly above */
  overlap?: boolean;
}) {
  const photo = featured?.photo ?? null;
  const certificate = featured?.certificate ?? null;

  return (
    <section
      id="education"
      className={`bg-ink relative z-10 px-5 py-20 sm:px-8 sm:py-24 md:px-10 md:py-32 ${
        overlap
          ? "-mt-10 rounded-t-[40px] sm:-mt-12 sm:rounded-t-[50px] md:-mt-14 md:rounded-t-[60px]"
          : ""
      }`}
    >
      <FadeIn delay={0} y={40}>
        <h2
          className="hero-heading mb-16 text-center leading-none font-black tracking-tight uppercase sm:mb-20 md:mb-28"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          Education
        </h2>
      </FadeIn>

      <div className="mx-auto max-w-6xl">
        {(photo || certificate) && featured && (
          <div
            data-education-featured
            className={`mb-16 grid gap-4 sm:mb-24 sm:gap-6 ${
              photo && certificate ? "md:grid-cols-[2fr_3fr]" : ""
            }`}
          >
            {photo && (
              <FadeIn
                delay={0.1}
                x={-80}
                y={0}
                duration={0.9}
                className="mx-auto w-full max-w-sm md:max-w-none"
              >
                <Photo
                  src={photo.url}
                  alt={photo.alt || `${featured.qualification} graduation`}
                  className="aspect-[4/5] object-top"
                />
              </FadeIn>
            )}
            {certificate && (
              <FadeIn
                delay={0.2}
                x={80}
                y={0}
                duration={0.9}
                className="flex flex-col justify-center gap-6"
              >
                <div
                  className={`${RADIUS} border-2 border-[#D7E2EA] p-3 sm:p-4`}
                >
                  <Photo
                    src={certificate.url}
                    alt={
                      certificate.alt ||
                      `${featured.qualification} degree certificate`
                    }
                    className="rounded-[22px] sm:rounded-[28px] md:rounded-[34px]"
                  />
                </div>
                <div className="flex flex-col gap-1 px-2">
                  <span className="text-mist text-xs font-light tracking-widest uppercase opacity-60 sm:text-sm">
                    {featured.institution}
                  </span>
                  <span
                    className="text-mist font-medium uppercase"
                    style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                  >
                    {featured.qualification}
                  </span>
                  {featured.grade && (
                    <span className="text-mist text-sm opacity-70 sm:text-base">
                      {featured.grade}
                    </span>
                  )}
                </div>
              </FadeIn>
            )}
          </div>
        )}

        {entries.length > 0 && (
          <ol className="mx-auto max-w-5xl">
            {entries.map((entry, i) => (
              <FadeIn
                as="li"
                key={entry.id}
                delay={i * 0.1}
                className="border-t border-[#D7E2EA]/20 last:border-b"
              >
                <div className="flex items-center gap-6 py-8 sm:gap-10 sm:py-10 md:gap-14 md:py-12">
                  <span
                    className="hero-heading leading-none font-black"
                    style={{ fontSize: "clamp(3rem, 10vw, 140px)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3
                      className="text-mist font-medium uppercase"
                      style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                    >
                      {entry.qualification}
                    </h3>
                    <p
                      className="text-mist font-light opacity-60"
                      style={{ fontSize: "clamp(0.85rem, 1.6vw, 1.25rem)" }}
                    >
                      {[
                        entry.institution,
                        [entry.start, entry.end].filter(Boolean).join(" – "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {entry.grade && (
                      <span className="text-mist w-fit rounded-full border border-[#D7E2EA]/30 px-4 py-1 text-xs font-medium tracking-wide uppercase sm:text-sm">
                        {entry.grade}
                      </span>
                    )}
                    {entry.description && (
                      <p className="text-mist max-w-2xl text-sm leading-relaxed font-light opacity-70 sm:text-base">
                        {entry.description}
                      </p>
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </ol>
        )}

        {skills.length > 0 && (
          <div
            id="skills"
            className={`mx-auto max-w-5xl ${entries.length > 0 ? "mt-20 sm:mt-28" : ""}`}
          >
            <FadeIn delay={0} y={30}>
              <h3 className="text-mist mb-10 text-center text-sm font-medium tracking-widest uppercase opacity-70 sm:mb-14 sm:text-base">
                Skills
              </h3>
            </FadeIn>
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
              {skills.map((group, i) => (
                <FadeIn key={group.group} delay={(i % 2) * 0.1}>
                  <h4 className="text-mist mb-3 text-base font-medium uppercase sm:text-lg">
                    {group.group}
                  </h4>
                  <ul className="flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="text-mist rounded-full border border-[#D7E2EA]/30 px-3 py-1 text-xs tracking-wide uppercase sm:text-sm"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
