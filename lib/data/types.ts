/** Domain types for site content (camelCase; mapped from database rows). */

export type ProjectStatus = "live" | "completed" | "in_progress";

export type Category = {
  id: string;
  slug: string;
  name: string;
  number: string;
  description: string;
  stack: string[];
  color: string;
  showInWhatIDo: boolean;
  sort: number;
};

export type ProjectType = {
  id: string;
  slug: string;
  name: string;
  hasClientFields: boolean;
  hasAutomationFields: boolean;
  hasProductFields: boolean;
  requiresClientApproval: boolean;
  sort: number;
};

export type ProjectLinks = {
  live?: string;
  github?: string;
  video?: string;
  huggingface?: string;
  writeup?: string;
};

export type Metric = { label: string; value: string; highlight: boolean };

export type TractionMetric = {
  label: string;
  value: string;
  asOf: string | null;
  showPublic: boolean;
};

export type ChangelogEntry = { date: string; note: string };

export type TrainedVsIntegratedRow = {
  component: string;
  kind: "trained" | "integrated";
  sourceModel: string;
  evaluation: string;
};

export type ProjectMedia = {
  kind: "gallery" | "dashboard";
  mediaType: "image" | "video";
  url: string;
  poster: string | null;
  alt: string;
};

export type Testimonial = {
  quote: string;
  name?: string;
  role?: string;
  photo?: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  typeId: string | null;
  primaryCategoryId: string | null;
  categoryIds: string[];
  status: ProjectStatus;
  showStatusBadge: boolean;
  published: boolean;
  shortDesc: string;
  caseStudyMd: string;
  tech: string[];
  links: ProjectLinks;
  startedOn: string | null;
  endedOn: string | null;

  sort: number;
  isKey: boolean;
  keySort: number;
  showInMarquee: boolean;
  marqueeSort: number;

  images: {
    leftTop: string | null;
    leftBottom: string | null;
    right: string | null;
  };
  marqueePoster: string | null;
  marqueeClip: string | null;
  architectureSvg: string | null;

  /** null when there is no client or the name is hidden */
  clientName: string | null;
  industry: string | null;
  myRole: string | null;
  testimonial: Testimonial | null;

  automationTrigger: string | null;
  apps: string[];
  workflowScreenshot: string | null;
  savingsText: string | null;
  workflowJsonPath: string | null;

  productName: string | null;
  productLogo: string | null;
  valueProp: string | null;
  productUrl: string | null;
  signupUrl: string | null;
  stage: "beta" | "launched" | null;
  pricingModel: "free" | "freemium" | "subscription" | "usage_based" | null;
  startingPrice: string | null;
  demoVideo: string | null;
  features: string[];

  galaxy: { x: number; y: number; z: number } | null;

  metrics: Metric[];
  traction: TractionMetric[];
  changelog: ChangelogEntry[];
  trainedVsIntegrated: TrainedVsIntegratedRow[];
  media: ProjectMedia[];
};

export type ExperienceEntry = {
  id: string;
  kind: "work" | "education";
  org: string;
  role: string;
  start: string;
  end: string;
  description: string;
};

export type SiteSettings = {
  heroTagline: string | null;
  aboutText: string | null;
  skills: string[];
  socials: { linkedin?: string; github?: string; email?: string };
  resumeUrl: string | null;
};

export type SiteContent = {
  categories: Category[];
  types: ProjectType[];
  projects: Project[];
  site: SiteSettings;
  experience: ExperienceEntry[];
};

export const EMPTY_CONTENT: SiteContent = {
  categories: [],
  types: [],
  projects: [],
  site: {
    heroTagline: null,
    aboutText: null,
    skills: [],
    socials: {},
    resumeUrl: null,
  },
  experience: [],
};
