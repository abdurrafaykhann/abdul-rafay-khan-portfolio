import "server-only";
import fs from "node:fs";
import path from "node:path";

const CANDIDATES = ["portrait.avif", "portrait.webp", "portrait.png"] as const;

/**
 * Public URL of the hero portrait, or null when no photo has been added yet
 * (the hero then renders without a portrait — never a placeholder).
 * Drop a background-removed photo at public/hero/portrait.(avif|webp|png).
 */
export function getHeroPortrait(): string | null {
  for (const file of CANDIDATES) {
    if (fs.existsSync(path.join(process.cwd(), "public", "hero", file))) {
      return `/hero/${file}`;
    }
  }
  return null;
}
