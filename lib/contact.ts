import { createHash } from "node:crypto";
import { z } from "zod";

export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.email("Please enter a valid email").max(254),
  message: z
    .string()
    .trim()
    .min(5, "Please write a few words")
    .max(4000, "That message is too long"),
  /** honeypot: real visitors never see or fill this */
  website: z.string().max(200).optional().default(""),
});

export type ContactInput = z.input<typeof ContactSchema>;

/**
 * A stable, anonymous id for rate limiting: a salted hash of IP + browser.
 * The IP itself is never stored.
 */
export function visitorHash(
  ip: string | null,
  userAgent: string | null,
  salt = process.env.VISITOR_SALT ?? process.env.CRON_SECRET ?? "portfolio",
): string {
  return createHash("sha256")
    .update(`${salt}|${ip ?? "?"}|${userAgent ?? "?"}`)
    .digest("hex")
    .slice(0, 32);
}

/** First address of x-forwarded-for (set by Vercel). */
export function clientIp(forwardedFor: string | null): string | null {
  return forwardedFor?.split(",")[0]?.trim() || null;
}
