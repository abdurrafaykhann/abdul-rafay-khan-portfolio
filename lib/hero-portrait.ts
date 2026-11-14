import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { PortraitAssets } from "@/components/hero/HeroPortrait";

const dir = path.join(process.cwd(), "public", "hero");
const exists = (file: string) => fs.existsSync(path.join(dir, file));

/**
 * The hero photo and its 3D assets, or null when no photo has been added yet
 * (the hero then renders without a portrait — never a placeholder).
 *   portrait.(avif|webp|png)   background-removed photo (tools/cutout.py)
 *   depth.webp, particles.bin  3D layer (tools/portrait_pipeline.py)
 */
export function getHeroPortrait(): PortraitAssets | null {
  const photo = ["portrait.avif", "portrait.webp", "portrait.png"].find(exists);
  if (!photo) return null;
  return {
    photo: `/hero/${photo}`,
    depth: exists("depth.webp") ? "/hero/depth.webp" : null,
    particles: exists("particles.bin") ? "/hero/particles.bin" : null,
  };
}
