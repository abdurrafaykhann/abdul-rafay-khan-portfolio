import type { Metadata } from "next";
import { fixtureImage, FIXTURE_CONTENT } from "@/components/dev/fixtures";
import { CaseStudy } from "@/components/work/CaseStudy";
import type { Project } from "@/lib/data/types";

// DEV-ONLY: a fully filled case study built from fixtures, to review the
// page before a real project is published.
export const metadata: Metadata = {
  title: "Case study preview (dev)",
  robots: { index: false, follow: false },
};

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="640" height="160"><g fill="none" stroke="#7621B0" stroke-width="2"><rect x="10" y="50" width="140" height="60" rx="10" fill="#18011F" stroke="#B600A8"/><rect x="250" y="50" width="140" height="60" rx="10" fill="#18011F"/><rect x="490" y="50" width="140" height="60" rx="10" fill="#18011F" stroke="#BE4C00"/><path d="M150 80H250M390 80H490"/></g><g fill="#D7E2EA" font-family="sans-serif" font-size="18" text-anchor="middle"><text x="80" y="86">User</text><text x="320" y="86">API</text><text x="560" y="86">Model</text></g></svg>`;

const base = FIXTURE_CONTENT.projects[0];
const rich: Project = {
  ...base,
  title: "Fixture Project",
  shortDesc:
    "Dev fixture, not real content. A short pitch for the project sits here.",
  status: "live",
  tech: ["Python", "LangChain", "n8n", "Next.js"],
  links: {
    live: "https://example.com/",
    github: "https://github.com/",
    video: "https://example.com/demo",
  },
  demoVideo: "https://example.com/demo",
  architectureSvg: SVG,
  industry: "Retail",
  clientName: null,
  myRole: "Solo developer",
  testimonial: {
    quote: "Dev fixture quote, not a real testimonial.",
    name: "Fixture Person",
    role: "Fixture role",
  },
  automationTrigger: "New message",
  apps: ["n8n", "Google Sheets", "WhatsApp"],
  savingsText: "Fixture time saved",
  workflowScreenshot: fixtureImage(2, "WORKFLOW"),
  productName: "Fixture Product",
  valueProp: "One line about what the product does.",
  signupUrl: "https://example.com/signup",
  stage: "beta",
  pricingModel: "freemium",
  startingPrice: "$9/month",
  features: ["Fixture feature one", "Fixture feature two", "Fixture three"],
  changelog: [
    { date: "2026-03-01", note: "Fixture release note" },
    { date: "2026-01-10", note: "First fixture version" },
  ],
  trainedVsIntegrated: [
    {
      component: "Fixture classifier",
      kind: "trained",
      sourceModel: "Fixture dataset",
      evaluation: "Fixture metric",
    },
    {
      component: "Fixture detector",
      kind: "integrated",
      sourceModel: "Pretrained model",
      evaluation: "",
    },
  ],
  caseStudyMd:
    "## The challenge\n\nDev fixture text, not real content. It shows how **markdown** reads: paragraphs, lists and `code`.\n\n- One fixture point\n- Another fixture point\n\n### What changed\n\n> A fixture quote block.",
  media: [
    {
      kind: "gallery",
      mediaType: "image",
      url: fixtureImage(3, "GALLERY 1"),
      poster: null,
      alt: "Fixture gallery",
    },
    {
      kind: "gallery",
      mediaType: "image",
      url: fixtureImage(5, "GALLERY 2"),
      poster: null,
      alt: "Fixture gallery",
    },
    {
      kind: "dashboard",
      mediaType: "image",
      url: fixtureImage(1, "DASHBOARD"),
      poster: null,
      alt: "Fixture dashboard",
    },
  ],
};

export default function CaseStudyPreview() {
  const content = {
    ...FIXTURE_CONTENT,
    projects: [rich, ...FIXTURE_CONTENT.projects.slice(1, 4)],
  };
  return (
    <div className="bg-ink min-h-svh">
      <CaseStudy project={rich} content={content} />
    </div>
  );
}
