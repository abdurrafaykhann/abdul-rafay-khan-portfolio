"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin/is-admin";
import { supabaseForRequest } from "@/lib/supabase/request";

export type LoginState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

const Email = z.email().max(254);

/**
 * Sends a magic link — but only to the admin email. Any other address gets
 * the same "check your inbox" reply, so the form never reveals who the admin
 * is. No account is ever created here (shouldCreateUser: false).
 */
export async function sendMagicLink(
  _prev: LoginState,
  form: FormData,
): Promise<LoginState> {
  const parsed = Email.safeParse(String(form.get("email") ?? "").trim());
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }
  const sent: LoginState = {
    status: "sent",
    message: "If that address is allowed in, a sign-in link is on its way.",
  };
  if (!isAdminEmail(parsed.data)) return sent;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const supabase = await supabaseForRequest();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${proto}://${host}/admin/auth/callback`,
    },
  });
  if (error) {
    console.error("[admin login] magic link failed:", error.message);
    return {
      status: "error",
      message: "Could not send the link right now. Try again in a minute.",
    };
  }
  return sent;
}
