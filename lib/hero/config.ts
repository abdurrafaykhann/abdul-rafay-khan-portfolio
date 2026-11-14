/** Central configuration for the cinematic hero: colours, camera, tiers. */

/** The site's palette. The hero uses nothing outside it. */
export const HERO_COLORS = {
  ink: "#0C0C0C",
  mist: "#D7E2EA",
  headingFrom: "#646973",
  headingTo: "#BBCCD7",
  plum: "#18011F",
  magenta: "#B600A8",
  purple: "#7621B0",
  glow: "#7721B1",
  orange: "#BE4C00",
  /** category colours: only for small data-visualisation details */
  categories: [
    "#B600A8", // AI Automations
    "#7621B0", // Agentic AI
    "#BE4C00", // Websites & Client Work
    "#2F80ED", // Computer Vision
    "#27AE60", // ML & Data Science
    "#D7E2EA", // 3D & WebGL
  ],
} as const;

/** Camera: vertical field of view (degrees) and resting distance. */
export const FOV = 30;
export const CAMERA_Z = 3;
/** World height visible at z = 0 with the camera at rest. */
export const WORLD_HEIGHT = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);

export type TierName = "desktop" | "tablet" | "mobile";

export type Tier = {
  name: TierName;
  /** extra scroll distance the hero stays pinned for, in svh */
  travel: number;
  /** how much larger the portrait appears at the end of the camera move */
  maxScale: number;
  dust: number;
  nodes: number;
  panels: number;
  pillars: boolean;
};

export const TIERS: Record<TierName, Tier> = {
  desktop: {
    name: "desktop",
    travel: 260,
    maxScale: 1.3,
    dust: 700,
    nodes: 72,
    panels: 3,
    pillars: true,
  },
  tablet: {
    name: "tablet",
    travel: 200,
    maxScale: 1.2,
    dust: 420,
    nodes: 48,
    panels: 2,
    pillars: true,
  },
  mobile: {
    name: "mobile",
    travel: 150,
    maxScale: 1.12,
    dust: 260,
    nodes: 30,
    panels: 2,
    pillars: false,
  },
};

export function tierForWidth(width: number): Tier {
  if (width < 640) return TIERS.mobile;
  if (width < 1024) return TIERS.tablet;
  return TIERS.desktop;
}
