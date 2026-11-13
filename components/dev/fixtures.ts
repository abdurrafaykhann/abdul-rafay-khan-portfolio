import type {
  Category,
  Project,
  ProjectType,
  SiteContent,
} from "@/lib/data/types";

/** DEV-ONLY fixture content for the /dev playground and its tests. */

const HUES = [285, 310, 265, 20, 200, 330, 240, 35, 180];

export function fixtureImage(
  n: number,
  label = `DEV FIXTURE ${n + 1}`,
): string {
  const hue = HUES[n % HUES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="270">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 70% 22%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 75% 45%)"/>
</linearGradient></defs>
<rect width="420" height="270" fill="url(#g)"/>
<text x="210" y="128" fill="#fff" font-family="sans-serif" font-size="26" font-weight="700" text-anchor="middle">${label}</text>
<text x="210" y="162" fill="#fff" opacity=".7" font-family="sans-serif" font-size="15" text-anchor="middle">not real content</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const CATEGORY_NAMES = [
  "Fixture Automations",
  "Fixture Agents",
  "Fixture Websites",
  "Fixture Vision",
];
const COLORS = ["#B600A8", "#7621B0", "#BE4C00", "#2F80ED"];

const categories: Category[] = CATEGORY_NAMES.map((name, i) => ({
  id: `cat-${i}`,
  slug: `fixture-${i}`,
  name,
  number: String(i + 1).padStart(2, "0"),
  description:
    "Dev fixture description, not real content. It only shows how a category reads in this list.",
  stack: ["Fixture A", "Fixture B", "Fixture C"],
  color: COLORS[i],
  showInWhatIDo: true,
  sort: i,
}));

const types: ProjectType[] = ["Client", "Personal", "SaaS product"].map(
  (name, i) => ({
    id: `type-${i}`,
    slug: `type-${i}`,
    name,
    hasClientFields: i === 0,
    hasAutomationFields: false,
    hasProductFields: i === 2,
    requiresClientApproval: i === 0,
    sort: i,
  }),
);

function project(n: number): Project {
  const isKey = n < 3;
  const primary = n % (categories.length - 1); // last category stays empty
  return {
    id: `proj-${n}`,
    slug: `fixture-project-${n + 1}`,
    title: `Fixture Project ${n + 1}`,
    typeId: types[n % types.length].id,
    primaryCategoryId: categories[primary].id,
    categoryIds: [categories[primary].id],
    status: (["live", "completed", "in_progress"] as const)[n % 3],
    showStatusBadge: n % 4 !== 3,
    published: true,
    shortDesc:
      "Dev fixture, not real content. A short description of the project sits here.",
    caseStudyMd: "",
    tech: [],
    links: n % 2 === 0 ? { live: "https://example.com/" } : {},
    startedOn: null,
    endedOn: null,
    sort: n,
    isKey,
    keySort: n,
    showInMarquee: false,
    marqueeSort: 0,
    images: isKey
      ? {
          leftTop: fixtureImage(n, `KEY ${n + 1} · LEFT TOP`),
          leftBottom: fixtureImage(n + 3, `KEY ${n + 1} · LEFT BOTTOM`),
          right: fixtureImage(n + 6, `KEY ${n + 1} · RIGHT`),
        }
      : {
          leftTop: null,
          leftBottom: null,
          // every fifth card has no image, to show the text-only layout
          right: n % 5 === 4 ? null : fixtureImage(n, `FIXTURE ${n + 1}`),
        },
    marqueePoster: null,
    marqueeClip: null,
    architectureSvg: null,
    clientName: null,
    industry: null,
    myRole: null,
    testimonial: null,
    automationTrigger: null,
    apps: [],
    workflowScreenshot: null,
    savingsText: null,
    workflowJsonPath: null,
    productName: null,
    productLogo: null,
    valueProp: null,
    productUrl: null,
    signupUrl: null,
    stage: null,
    pricingModel: null,
    startingPrice: null,
    demoVideo: null,
    features: [],
    galaxy: null,
    metrics: isKey
      ? [
          { label: "fixture metric", value: `${90 + n}%`, highlight: true },
          { label: "hidden metric", value: "1", highlight: false },
        ]
      : [],
    traction:
      n === 2
        ? [
            {
              label: "fixture users",
              value: "120",
              asOf: "2026-01-01",
              showPublic: true,
            },
          ]
        : [],
    changelog: [],
    trainedVsIntegrated: [],
    media: [],
  };
}

/** 15 projects: 3 key ones, 3 used categories (+1 empty), so "Load more",
 *  the filter bar and the stacking cards can all be exercised. */
export const FIXTURE_CONTENT: SiteContent = {
  categories,
  types,
  projects: Array.from({ length: 15 }, (_, n) => project(n)),
  site: {
    heroTagline: null,
    aboutText:
      "Dev fixture text, not real content. This paragraph only exists so the scroll reveal can be reviewed: each character brightens in turn as the section moves up the screen. The real bio comes from the admin.",
    skills: [],
    socials: {},
    resumeUrl: null,
  },
  experience: [],
};
