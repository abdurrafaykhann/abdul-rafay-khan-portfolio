import Link from "next/link";
import type { ReactNode } from "react";
import { MetricBadge, StatusBadge } from "@/components/ui/Badges";
import { Markdown } from "@/components/work/Markdown";
import { TrackedLink, TrackView } from "@/components/work/Track";
import {
  adjacentProjects,
  caseStudyBlocks,
  cardBadges,
  primaryCategory,
  projectType,
} from "@/lib/data/select";
import type { Project, SiteContent } from "@/lib/data/types";
import { isVideoFile, storageUrl } from "@/lib/storage-url";

const PRICING: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  subscription: "Subscription",
  usage_based: "Usage-based",
};
const LINK_LABELS: Record<string, string> = {
  live: "Live project",
  github: "GitHub",
  video: "Video",
  huggingface: "Hugging Face",
  writeup: "Write-up",
};

const pill =
  "text-mist inline-block rounded-full border-2 border-[#D7E2EA] px-6 py-2.5 text-sm font-medium tracking-widest uppercase transition-colors duration-200 hover:bg-[#D7E2EA]/10";

function Block({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-16 sm:mt-24">
      <h2 className="hero-heading mb-6 text-3xl leading-none font-black tracking-tight uppercase sm:mb-8 sm:text-5xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="text-mist rounded-full border border-[#D7E2EA]/30 px-3 py-1 text-xs tracking-wide uppercase sm:text-sm">
      {children}
    </span>
  );
}

export function CaseStudy({
  project: p,
  content,
}: {
  project: Project;
  content: SiteContent;
}) {
  const b = caseStudyBlocks(p);
  const type = projectType(p, content.types);
  const category = primaryCategory(p, content.categories);
  const { prev, next } = adjacentProjects(content, p.slug);
  const badges = cardBadges(p);
  const tryIt = p.signupUrl ?? p.productUrl;
  const demo = p.demoVideo ?? p.links.video ?? null;
  const workflowUrl = p.workflowJsonPath
    ? storageUrl(p.workflowJsonPath)
    : null;
  const dashboards = p.media.filter((m) => m.kind === "dashboard");
  const gallery = p.media.filter((m) => m.kind === "gallery");

  return (
    <article className="text-mist mx-auto max-w-5xl px-5 pt-28 pb-24 sm:px-8 sm:pt-36">
      <TrackView projectId={p.id} />

      {/* Header */}
      <header>
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs tracking-widest uppercase opacity-80">
          {type && <span>{type.name}</span>}
          {category && (
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: category.color }}
              />
              {category.name}
            </span>
          )}
          {p.showStatusBadge && <StatusBadge status={p.status} />}
        </div>
        <h1
          className="hero-heading leading-none font-black tracking-tight uppercase"
          style={{ fontSize: "clamp(2.5rem, 9vw, 7rem)" }}
        >
          {p.title}
        </h1>
        {b.pitch && (
          <p
            className="mt-6 max-w-3xl leading-relaxed font-light"
            style={{ fontSize: "clamp(1.05rem, 2vw, 1.5rem)" }}
          >
            {p.shortDesc}
          </p>
        )}
        {(tryIt || p.links.live || p.links.github) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {tryIt && (
              <TrackedLink
                projectId={p.id}
                target="try-it"
                href={tryIt}
                className="inline-block rounded-full bg-[#D7E2EA] px-7 py-3 text-sm font-medium tracking-widest text-[#0C0C0C] uppercase hover:bg-white"
              >
                Try it
              </TrackedLink>
            )}
            {p.links.live && p.links.live !== tryIt && (
              <TrackedLink
                projectId={p.id}
                target="live"
                href={p.links.live}
                className={pill}
              >
                Live project
              </TrackedLink>
            )}
            {p.links.github && (
              <TrackedLink
                projectId={p.id}
                target="github"
                href={p.links.github}
                className={pill}
              >
                GitHub
              </TrackedLink>
            )}
          </div>
        )}
        {badges.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-2">
            {badges.map((m) => (
              <li key={`${m.label}:${m.value}`}>
                <MetricBadge badge={m} />
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* Demo */}
      {b.demo && demo && (
        <Block id="demo" title="Demo">
          {isVideoFile(demo) ? (
            <video
              src={demo}
              controls
              preload="none"
              playsInline
              poster={p.marqueePoster ?? undefined}
              className="w-full rounded-[28px] bg-black sm:rounded-[40px]"
            />
          ) : (
            <TrackedLink
              projectId={p.id}
              target="demo"
              href={demo}
              className={pill}
            >
              Watch the demo
            </TrackedLink>
          )}
        </Block>
      )}

      {/* Product */}
      {b.product && (
        <Block id="product" title={p.productName ?? "The product"}>
          <div className="flex flex-col gap-6">
            {p.valueProp && (
              <p className="max-w-3xl text-xl leading-relaxed font-light sm:text-2xl">
                {p.valueProp}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {p.stage && <Tag>{p.stage === "beta" ? "Beta" : "Launched"}</Tag>}
              {p.pricingModel && (
                <Tag>
                  {PRICING[p.pricingModel]}
                  {p.startingPrice ? ` · from ${p.startingPrice}` : ""}
                </Tag>
              )}
            </div>
            {p.features.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-3 font-light">
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-[#B600A8]"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            )}
            {p.changelog.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium tracking-widest uppercase opacity-70">
                  Changelog
                </h3>
                <ol className="flex flex-col gap-3 border-l border-[#D7E2EA]/25 pl-5">
                  {p.changelog.map((c) => (
                    <li key={`${c.date}:${c.note}`}>
                      <time className="text-xs tracking-wider uppercase opacity-60">
                        {c.date}
                      </time>
                      <p className="font-light">{c.note}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </Block>
      )}

      {/* Client */}
      {b.client && (
        <Block id="client" title="The client">
          <div className="flex flex-col gap-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              {(p.clientName || p.industry) && (
                <div>
                  <dt className="text-xs tracking-widest uppercase opacity-60">
                    Client
                  </dt>
                  <dd className="mt-1 text-lg">
                    {p.clientName ?? `A client in ${p.industry}`}
                    {p.clientName && p.industry ? ` · ${p.industry}` : ""}
                  </dd>
                </div>
              )}
              {p.myRole && (
                <div>
                  <dt className="text-xs tracking-widest uppercase opacity-60">
                    My role
                  </dt>
                  <dd className="mt-1 text-lg">{p.myRole}</dd>
                </div>
              )}
            </dl>
            {p.testimonial && (
              <figure className="rounded-[28px] border border-[#D7E2EA]/25 p-6 sm:p-8">
                <blockquote className="text-xl leading-relaxed font-light sm:text-2xl">
                  &ldquo;{p.testimonial.quote}&rdquo;
                </blockquote>
                {(p.testimonial.name ||
                  p.testimonial.role ||
                  p.testimonial.photo) && (
                  <figcaption className="mt-5 flex items-center gap-3 text-sm">
                    {p.testimonial.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.testimonial.photo}
                        alt=""
                        loading="lazy"
                        className="size-12 rounded-full object-cover"
                      />
                    )}
                    <span>
                      <strong className="font-medium">
                        {p.testimonial.name}
                      </strong>
                      {p.testimonial.name && p.testimonial.role ? ", " : ""}
                      <span className="opacity-70">{p.testimonial.role}</span>
                    </span>
                  </figcaption>
                )}
              </figure>
            )}
          </div>
        </Block>
      )}

      {/* Automation */}
      {b.automation && (
        <Block id="automation" title="The automation">
          <div className="flex flex-col gap-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              {p.automationTrigger && (
                <div>
                  <dt className="text-xs tracking-widest uppercase opacity-60">
                    Trigger
                  </dt>
                  <dd className="mt-1 text-lg">{p.automationTrigger}</dd>
                </div>
              )}
              {p.savingsText && (
                <div>
                  <dt className="text-xs tracking-widest uppercase opacity-60">
                    Saved
                  </dt>
                  <dd className="mt-1 text-lg">{p.savingsText}</dd>
                </div>
              )}
            </dl>
            {p.apps.length > 0 && (
              <ul
                className="flex flex-wrap gap-2"
                aria-label="Apps and tools used"
              >
                {p.apps.map((a) => (
                  <li key={a}>
                    <Tag>{a}</Tag>
                  </li>
                ))}
              </ul>
            )}
            {p.workflowScreenshot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.workflowScreenshot}
                alt={`${p.title} workflow in n8n`}
                loading="lazy"
                className="w-full rounded-[28px] sm:rounded-[40px]"
              />
            )}
            {dashboards.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {dashboards.map((m) =>
                  m.mediaType === "video" ? (
                    <video
                      key={m.url}
                      src={m.url}
                      controls
                      preload="none"
                      playsInline
                      className="w-full rounded-[24px] bg-black"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={m.url}
                      src={m.url}
                      alt={m.alt || `${p.title} dashboard`}
                      loading="lazy"
                      className="w-full rounded-[24px]"
                    />
                  ),
                )}
              </div>
            )}
            {workflowUrl && (
              <a
                href={workflowUrl}
                download={`${p.slug}.n8n.json`}
                className={`${pill} self-start`}
              >
                Download the workflow (JSON)
              </a>
            )}
          </div>
        </Block>
      )}

      {/* Architecture */}
      {b.architecture && p.architectureSvg && (
        <Block id="architecture" title="Architecture">
          {/* An <img> data URI: scripts inside an SVG never run in this context. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.architectureSvg)}`}
            alt={`Architecture diagram of ${p.title}`}
            className="w-full rounded-[28px] border border-[#D7E2EA]/15 bg-[#0C0C0C] p-4 sm:rounded-[40px] sm:p-8"
          />
        </Block>
      )}

      {/* Trained vs integrated */}
      {b.trainedVsIntegrated && (
        <Block id="trained-vs-integrated" title="Trained vs. integrated">
          <p className="mb-6 max-w-3xl font-light opacity-80">
            What I trained myself, and what I integrated and evaluated.
          </p>
          <div className="overflow-x-auto rounded-[28px] border border-[#D7E2EA]/20">
            <table className="w-full min-w-[640px] text-left text-sm sm:text-base">
              <thead className="text-xs tracking-widest uppercase opacity-60">
                <tr>
                  <th className="px-5 py-4 font-medium">Component</th>
                  <th className="px-5 py-4 font-medium">Role</th>
                  <th className="px-5 py-4 font-medium">Model / data</th>
                  <th className="px-5 py-4 font-medium">Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {p.trainedVsIntegrated.map((r) => (
                  <tr
                    key={r.component}
                    className="border-t border-[#D7E2EA]/15 align-top"
                  >
                    <td className="px-5 py-4 font-medium">{r.component}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs tracking-wide uppercase ${
                          r.kind === "trained"
                            ? "bg-[#B600A8]/25 text-fuchsia-100"
                            : "bg-[#D7E2EA]/10"
                        }`}
                      >
                        {r.kind === "trained" ? "Trained by me" : "Integrated"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-light">
                      {r.sourceModel || "—"}
                    </td>
                    <td className="px-5 py-4 font-light">
                      {r.evaluation || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {/* Story (challenges, decisions…) */}
      {b.story && (
        <Block id="story" title="The story">
          <div className="max-w-3xl">
            <Markdown source={p.caseStudyMd} />
          </div>
        </Block>
      )}

      {/* Tech */}
      {b.tech && (
        <Block id="tech" title="Tech stack">
          <ul className="flex flex-wrap gap-2">
            {p.tech.map((t) => (
              <li key={t}>
                <Tag>{t}</Tag>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* Links */}
      {b.links && (
        <Block id="links" title="Links">
          <ul className="flex flex-wrap gap-3">
            {Object.entries(p.links).map(([key, href]) => (
              <li key={key}>
                <TrackedLink
                  projectId={p.id}
                  target={key}
                  href={href}
                  className={pill}
                >
                  {LINK_LABELS[key] ?? key}
                </TrackedLink>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* Gallery */}
      {b.gallery && (
        <Block id="gallery" title="Gallery">
          <div className="grid gap-4 sm:grid-cols-2">
            {gallery.map((m) =>
              m.mediaType === "video" ? (
                <video
                  key={m.url}
                  src={m.url}
                  controls
                  preload="none"
                  playsInline
                  className="w-full rounded-[24px] bg-black"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.url}
                  src={m.url}
                  alt={m.alt || `${p.title} screenshot`}
                  loading="lazy"
                  className="w-full rounded-[24px]"
                />
              ),
            )}
          </div>
        </Block>
      )}

      {/* Previous / next */}
      {(prev || next) && (
        <nav
          aria-label="More projects"
          className="mt-20 grid gap-4 border-t border-[#D7E2EA]/20 pt-10 sm:mt-28 sm:grid-cols-2"
        >
          {prev && (
            <Link
              href={`/work/${prev.slug}`}
              className="group rounded-[28px] border border-[#D7E2EA]/25 p-6 transition-colors hover:border-[#D7E2EA]/70"
            >
              <span className="text-xs tracking-widest uppercase opacity-60">
                ← Previous
              </span>
              <span className="mt-2 block text-xl font-medium uppercase group-hover:underline">
                {prev.title}
              </span>
            </Link>
          )}
          {next && (
            <Link
              href={`/work/${next.slug}`}
              className="group rounded-[28px] border border-[#D7E2EA]/25 p-6 text-right transition-colors hover:border-[#D7E2EA]/70 sm:col-start-2"
            >
              <span className="text-xs tracking-widest uppercase opacity-60">
                Next →
              </span>
              <span className="mt-2 block text-xl font-medium uppercase group-hover:underline">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
