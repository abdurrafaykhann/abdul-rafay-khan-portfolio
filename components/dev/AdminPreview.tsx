"use client";

import { useState } from "react";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { KeyProjectsList } from "@/components/admin/KeyProjectsList";
import { ProjectEditor } from "@/components/admin/ProjectEditor";
import { ProjectsList } from "@/components/admin/ProjectsList";
import { TypesManager } from "@/components/admin/TypesManager";
import type { AdminProject } from "@/lib/admin/data";
import type { ProjectData } from "@/lib/admin/schema";
import { FIXTURE_CONTENT } from "./fixtures";

/** DEV-ONLY: the admin screens with fixture data (see app/dev/admin). */

const projects: AdminProject[] = FIXTURE_CONTENT.projects.map((p, i) => ({
  ...p,
  published: i % 4 !== 3,
  rawClientName: "",
  clientApproved: false,
  hideClientName: false,
  architectureMermaid: "",
}));

const first = projects[0];
const editorData: ProjectData = {
  id: first.id,
  slug: first.slug,
  title: first.title,
  typeId: first.typeId ?? "",
  primaryCategoryId: first.primaryCategoryId ?? "",
  categoryIds: [],
  status: first.status,
  showStatusBadge: first.showStatusBadge,
  published: first.published,
  shortDesc: first.shortDesc,
  caseStudyMd: "## The problem\n\nDev fixture case study, not real content.",
  tech: ["Fixture A", "Fixture B"],
  links: {
    live: "https://example.com/",
    github: "",
    video: "",
    huggingface: "",
    writeup: "",
  },
  startedOn: "",
  endedOn: "",
  isKey: first.isKey,
  showInMarquee: false,
  imgLeftTop: first.images.leftTop ?? "",
  imgLeftBottom: first.images.leftBottom ?? "",
  imgRight: first.images.right ?? "",
  marqueePoster: "",
  marqueeClip: "",
  architectureMermaid: "",
  clientName: "",
  hideClientName: false,
  industry: "",
  myRole: "",
  clientApproved: false,
  testimonial: { quote: "", name: "", role: "", photo: "" },
  automationTrigger: "",
  apps: [],
  workflowScreenshot: "",
  savingsText: "",
  productName: "",
  productLogo: "",
  valueProp: "",
  productUrl: "",
  signupUrl: "",
  stage: "",
  pricingModel: "",
  startingPrice: "",
  demoVideo: "",
  features: [],
  metrics: first.metrics,
  traction: [],
  changelog: [],
  trainedVsIntegrated: [],
  media: [],
};

const TABS = [
  "Projects",
  "Edit project",
  "Key projects",
  "Categories",
  "Types",
] as const;

export function AdminPreview() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Projects");
  const usage = Object.fromEntries(
    FIXTURE_CONTENT.categories.map((c) => [c.id, 4]),
  );
  const typeUsage = Object.fromEntries(
    FIXTURE_CONTENT.types.map((t) => [t.id, 5]),
  );

  return (
    <div className="text-mist min-h-svh">
      <header className="sticky top-0 z-30 border-b border-[#D7E2EA]/10 bg-[#0C0C0C]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <span className="font-black tracking-tight uppercase">
            Rafay · Admin
          </span>
          <nav aria-label="Admin" className="flex flex-wrap gap-4 text-sm">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? "underline underline-offset-4"
                    : "opacity-70 hover:opacity-100"
                }
              >
                {t}
              </button>
            ))}
          </nav>
          <span className="ml-auto rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-100">
            Dev preview · sample data · saving disabled
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        {tab === "Projects" && (
          <ProjectsList
            projects={projects}
            categories={FIXTURE_CONTENT.categories}
            types={FIXTURE_CONTENT.types}
          />
        )}
        {tab === "Edit project" && (
          <ProjectEditor
            initial={editorData}
            categories={FIXTURE_CONTENT.categories}
            types={FIXTURE_CONTENT.types}
          />
        )}
        {tab === "Key projects" && (
          <KeyProjectsList projects={projects.filter((p) => p.isKey)} />
        )}
        {tab === "Categories" && (
          <CategoriesManager
            categories={FIXTURE_CONTENT.categories}
            usage={usage}
          />
        )}
        {tab === "Types" && (
          <TypesManager types={FIXTURE_CONTENT.types} usage={typeUsage} />
        )}
      </main>
    </div>
  );
}
