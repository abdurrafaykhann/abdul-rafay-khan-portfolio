/** Public URL of a file in the Supabase "media" bucket. */
export function storageUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !path) return null;
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/media/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

/** True for a direct video file (played inline); false for YouTube etc. */
export function isVideoFile(url: string): boolean {
  return /\.(mp4|webm)(\?.*)?$/i.test(url);
}
