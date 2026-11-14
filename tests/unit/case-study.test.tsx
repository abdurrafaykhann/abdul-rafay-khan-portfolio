import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FIXTURE_CONTENT } from "@/components/dev/fixtures";
import { CaseStudy } from "@/components/work/CaseStudy";
import { checkSvg } from "@/lib/admin/svg";
import {
  adjacentProjects,
  caseStudyBlocks,
  findProject,
} from "@/lib/data/select";
import type { Project } from "@/lib/data/types";
import {
  creativeWorkJsonLd,
  jsonLd,
  personJsonLd,
  projectDescription,
} from "@/lib/seo";
import { storageUrl, isVideoFile } from "@/lib/storage-url";

// jsdom has no sendBeacon; the tracker falls back to it when present
const beacon = vi.fn();
Object.defineProperty(navigator, "sendBeacon", {
  value: beacon,
  configurable: true,
});

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const base = FIXTURE_CONTENT.projects[4]; // a plain project: no images, no metrics
const bare: Project = {
  ...base,
  shortDesc: "",
  metrics: [],
  traction: [],
  tech: [],
  links: {},
  media: [],
  images: { leftTop: null, leftBottom: null, right: null },
};
const content = {
  ...FIXTURE_CONTENT,
  projects: [bare, ...FIXTURE_CONTENT.projects.slice(5, 8)],
};

describe("caseStudyBlocks: nothing empty is ever shown", () => {
  it("a bare project has no optional blocks", () => {
    const b = caseStudyBlocks(bare);
    expect(Object.values(b).every((v) => v === false)).toBe(true);
  });

  it("each block turns on with its own data", () => {
    expect(caseStudyBlocks({ ...bare, shortDesc: "x" }).pitch).toBe(true);
    expect(caseStudyBlocks({ ...bare, industry: "Retail" }).client).toBe(true);
    expect(
      caseStudyBlocks({ ...bare, automationTrigger: "Webhook" }).automation,
    ).toBe(true);
    expect(caseStudyBlocks({ ...bare, productName: "Acme" }).product).toBe(
      true,
    );
    expect(
      caseStudyBlocks({ ...bare, architectureSvg: "<svg/>" }).architecture,
    ).toBe(true);
    expect(caseStudyBlocks({ ...bare, caseStudyMd: "  \n " }).story).toBe(
      false,
    );
    expect(caseStudyBlocks({ ...bare, caseStudyMd: "## Hi" }).story).toBe(true);
  });

  it("traction alone does not open the product block (it shows as header badges)", () => {
    const t = [{ label: "MRR", value: "$9", asOf: null, showPublic: false }];
    expect(caseStudyBlocks({ ...bare, traction: t }).product).toBe(false);
    expect(
      caseStudyBlocks({ ...bare, traction: [{ ...t[0], showPublic: true }] })
        .product,
    ).toBe(false);
  });
});

describe("navigation between projects", () => {
  it("finds a project by slug and wraps previous / next around", () => {
    const slugs = content.projects.map((p) => p.slug);
    expect(findProject(content, slugs[0])?.id).toBe(bare.id);
    expect(findProject(content, "nope")).toBeNull();
    const first = adjacentProjects(content, slugs[0]);
    expect(first.next?.slug).toBe(slugs[1]);
    expect(first.prev?.slug).toBe(slugs[slugs.length - 1]);
  });

  it("has no neighbours when there is only one project", () => {
    expect(
      adjacentProjects({ ...content, projects: [bare] }, bare.slug),
    ).toEqual({
      prev: null,
      next: null,
    });
  });
});

describe("CaseStudy page", () => {
  it("records one page view for the project", () => {
    beacon.mockClear();
    render(<CaseStudy project={bare} content={content} />);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe("/api/track");
  });

  it("renders just the title for a bare project (no empty headings)", () => {
    const { container } = render(
      <CaseStudy project={bare} content={content} />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: bare.title }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("h2")).toHaveLength(0);
    expect(
      screen.getByRole("navigation", { name: "More projects" }),
    ).toBeInTheDocument();
  });

  it("shows trained-vs-integrated, tech, links, story and product blocks when filled", () => {
    const p: Project = {
      ...bare,
      shortDesc: "The pitch.",
      tech: ["Python", "LangChain"],
      links: { live: "https://example.com", github: "https://github.com/x/y" },
      caseStudyMd:
        "## Challenge\n\nWe had **a problem**.\n\n<script>alert(1)</script>",
      trainedVsIntegrated: [
        {
          component: "Detector",
          kind: "trained",
          sourceModel: "Own data",
          evaluation: "79% recall",
        },
        {
          component: "Faces",
          kind: "integrated",
          sourceModel: "SFace",
          evaluation: "",
        },
      ],
      productName: "Acme",
      valueProp: "Does a thing",
      signupUrl: "https://acme.dev/signup",
      stage: "beta",
      pricingModel: "freemium",
      traction: [
        { label: "Users", value: "120", asOf: "2026-01-01", showPublic: true },
        { label: "MRR", value: "$900", asOf: null, showPublic: false },
      ],
      changelog: [{ date: "2026-02-01", note: "Launched" }],
      clientName: null,
      industry: "Retail",
    };
    const { container } = render(<CaseStudy project={p} content={content} />);
    const headings = [...container.querySelectorAll("h2")].map(
      (h) => h.textContent,
    );
    expect(headings).toEqual(
      expect.arrayContaining([
        "Acme",
        "The client",
        "Trained vs. integrated",
        "The story",
        "Tech stack",
        "Links",
      ]),
    );
    expect(screen.getByText("The pitch.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try it" })).toHaveAttribute(
      "href",
      "https://acme.dev/signup",
    );
    expect(screen.getByText("A client in Retail")).toBeInTheDocument();

    const table = screen.getByRole("table");
    expect(within(table).getByText("Trained by me")).toBeInTheDocument();
    expect(within(table).getByText("Integrated")).toBeInTheDocument();

    // only public traction; changelog shown
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.queryByText("$900")).not.toBeInTheDocument();
    expect(screen.getByText("Launched")).toBeInTheDocument();

    // markdown is rendered and raw HTML is not
    expect(
      screen.getByRole("heading", { name: "Challenge" }),
    ).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).not.toContain("alert(1)");

    // external links are safe
    const githubLinks = screen.getAllByRole("link", { name: "GitHub" });
    expect(githubLinks.length).toBeGreaterThanOrEqual(1); // header + links block
    for (const gh of githubLinks) {
      expect(gh).toHaveAttribute("rel", "noopener noreferrer");
      expect(gh).toHaveAttribute("target", "_blank");
    }
  });

  it("hides the client name when it is not public and never invents one", () => {
    render(
      <CaseStudy
        project={{ ...bare, clientName: null, industry: "Healthcare" }}
        content={content}
      />,
    );
    expect(screen.getByText("A client in Healthcare")).toBeInTheDocument();
  });

  it("shows the architecture as an image, not as injected markup", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
    const { container } = render(
      <CaseStudy
        project={{ ...bare, architectureSvg: svg }}
        content={content}
      />,
    );
    const img = screen.getByAltText(`Architecture diagram of ${bare.title}`);
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
    expect(container.querySelector("svg")).toBeNull();
  });
});

describe("checkSvg", () => {
  it("accepts a plain SVG and an empty diagram", () => {
    expect(checkSvg('<svg viewBox="0 0 1 1"><g/></svg>').ok).toBe(true);
    expect(checkSvg("")).toEqual({ ok: true, svg: "" });
  });

  it("rejects scripts, event handlers, embedded HTML and non-SVG", () => {
    for (const bad of [
      "<svg><script>alert(1)</script></svg>",
      '<svg onload="x()"></svg>',
      "<svg><foreignObject><div/></foreignObject></svg>",
      '<svg><a href="javascript:alert(1)"/></svg>',
      "<div>hello</div>",
      "x".repeat(300_001),
    ]) {
      expect(checkSvg(bad).ok).toBe(false);
    }
  });
});

describe("SEO helpers", () => {
  it("escapes < so JSON-LD cannot close its own script tag", () => {
    const out = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });

  it("describes the person and each project", () => {
    expect(
      personJsonLd({ linkedin: "https://linkedin.com/in/x" }),
    ).toMatchObject({
      "@type": "Person",
      name: "Abdul Rafay Khan",
      sameAs: ["https://linkedin.com/in/x"],
    });
    const w = creativeWorkJsonLd({
      ...bare,
      shortDesc: "Hello",
      tech: ["A", "B"],
    });
    expect(w).toMatchObject({
      "@type": "CreativeWork",
      name: bare.title,
      keywords: "A, B",
    });
    expect(String(w.url)).toContain(`/work/${bare.slug}`);
    expect(
      projectDescription({ ...bare, shortDesc: "x".repeat(300) }).length,
    ).toBeLessThanOrEqual(200);
  });
});

describe("storage helpers", () => {
  it("builds public storage URLs and detects video files", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    expect(storageUrl("workflows/a b.json")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/media/workflows/a%20b.json",
    );
    vi.unstubAllEnvs();
    expect(isVideoFile("https://x.dev/demo.mp4")).toBe(true);
    expect(isVideoFile("https://youtube.com/watch?v=1")).toBe(false);
  });
});
