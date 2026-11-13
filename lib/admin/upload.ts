"use client";

import imageCompression from "browser-image-compression";
import { supabaseBrowser } from "@/lib/supabase/browser";

export const MAX_VIDEO_MB = 8;
export const MAX_IMAGE_INPUT_MB = 25;
const BUCKET = "media";

export type PixelArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

/** Crops an image file to the given pixel area (from the cropper). */
export async function cropImage(file: File, area: PixelArea): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(area.width);
    canvas.height = Math.round(area.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");
    ctx.drawImage(
      img,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const blob = await new Promise<Blob | null>((r) =>
      canvas.toBlob(r, "image/png"),
    );
    if (!blob) throw new Error("Could not crop the image");
    return new File([blob], "cropped.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks and converts to WebP (≤ maxWidth px, ~≤ 600 KB). */
export async function compressImage(
  file: File,
  maxWidth = 2000,
): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: maxWidth,
    maxSizeMB: 0.6,
    fileType: "image/webp",
    initialQuality: 0.85,
    useWebWorker: true,
  });
}

function safeName(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .slice(0, 40) || "file"
  );
}

/**
 * Uploads to Supabase Storage as the signed-in admin (Storage policies only
 * allow the admin to write) and returns the public URL.
 */
export async function uploadFile(
  file: Blob,
  folder: string,
  slot: string,
  ext: string,
) {
  const path = `${safeName(folder)}/${safeName(slot)}-${Date.now()}.${ext}`;
  const supabase = supabaseBrowser();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export function checkVideo(file: File): string | null {
  if (!["video/mp4", "video/webm"].includes(file.type))
    return "Use an MP4 or WebM video.";
  if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
    return `That video is ${(file.size / 1024 / 1024).toFixed(1)} MB. Keep clips under ${MAX_VIDEO_MB} MB (short, muted, 720p is plenty).`;
  }
  return null;
}

export function checkImage(file: File): string | null {
  if (!file.type.startsWith("image/")) return "That file is not an image.";
  if (file.size > MAX_IMAGE_INPUT_MB * 1024 * 1024)
    return `Images must be under ${MAX_IMAGE_INPUT_MB} MB.`;
  return null;
}
