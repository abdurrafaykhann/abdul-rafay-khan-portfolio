/**
 * The public address of the site (no trailing slash). Set NEXT_PUBLIC_SITE_URL
 * once a custom domain exists; until then Vercel provides the production
 * address automatically.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
