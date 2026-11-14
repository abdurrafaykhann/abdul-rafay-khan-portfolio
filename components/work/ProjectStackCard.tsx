import Link from "next/link";
import { MetricBadge } from "@/components/ui/Badges";
import { LiveProjectButton } from "@/components/ui/LiveProjectButton";
import { cardBadges } from "@/lib/data/select";
import type { Project } from "@/lib/data/types";

const RADIUS = "rounded-[40px] sm:rounded-[50px] md:rounded-[60px]";

function CardImage({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${RADIUS} w-full object-cover ${className ?? ""}`}
      style={style}
    />
  );
}

/**
 * One key-project card (the template's project card): number, type label,
 * name, Live Project / GitHub buttons, metric badges and the 2-left + 1-right
 * image grid. Anything without data is simply left out.
 */
export function ProjectStackCard({
  project,
  index,
  typeLabel,
}: {
  project: Project;
  index: number;
  typeLabel: string | null;
}) {
  const badges = cardBadges(project);
  const { leftTop, leftBottom, right } = project.images;
  const hasLeft = !!(leftTop || leftBottom);
  const hasImages = hasLeft || !!right;

  return (
    <article
      className={`${RADIUS} bg-ink border-2 border-[#D7E2EA] p-4 sm:p-6 md:p-8`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-2 pb-4 sm:px-3 sm:pb-6">
        <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
          <span
            className="hero-heading leading-none font-black"
            style={{ fontSize: "clamp(3rem, 10vw, 140px)" }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex flex-col gap-1">
            {typeLabel && (
              <span className="text-mist text-xs font-light tracking-widest uppercase opacity-60 sm:text-sm">
                {typeLabel}
              </span>
            )}
            <h3
              className="text-mist font-medium uppercase"
              style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
            >
              <Link
                href={`/work/${project.slug}`}
                className="underline-offset-4 hover:underline"
              >
                {project.title}
              </Link>
            </h3>
          </div>
        </div>
        {(project.links.live || project.links.github) && (
          <div className="flex flex-wrap gap-3">
            {project.links.live && (
              <LiveProjectButton href={project.links.live} />
            )}
            {project.links.github && (
              <LiveProjectButton href={project.links.github} label="GitHub" />
            )}
          </div>
        )}
      </div>

      {badges.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-2 pb-4 sm:px-3 sm:pb-6">
          {badges.map((badge) => (
            <li key={`${badge.label}:${badge.value}`}>
              <MetricBadge badge={badge} />
            </li>
          ))}
        </ul>
      )}

      {hasImages && (
        <div className="flex gap-3 sm:gap-4">
          {hasLeft && (
            <div
              className={`flex flex-col gap-3 sm:gap-4 ${right ? "w-[40%]" : "w-full"}`}
            >
              {leftTop && (
                <CardImage
                  src={leftTop}
                  alt={`${project.title} screenshot`}
                  style={{ height: "clamp(130px, 16vw, 230px)" }}
                />
              )}
              {leftBottom && (
                <CardImage
                  src={leftBottom}
                  alt={`${project.title} screenshot`}
                  style={{ height: "clamp(160px, 22vw, 340px)" }}
                />
              )}
            </div>
          )}
          {right && (
            <div className={hasLeft ? "w-[60%]" : "w-full"}>
              <CardImage
                src={right}
                alt={`${project.title} main screenshot`}
                className="h-full"
                style={
                  hasLeft ? undefined : { height: "clamp(290px, 38vw, 570px)" }
                }
              />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
