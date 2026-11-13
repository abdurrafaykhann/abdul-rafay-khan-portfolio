/** True only for the configured admin email (case-insensitive, trimmed). */
export function isAdminEmail(
  email: string | null | undefined,
  adminEmail: string | null | undefined = process.env.ADMIN_EMAIL,
): boolean {
  if (!email || !adminEmail) return false;
  return email.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}
