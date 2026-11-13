import "server-only";
import { redirect } from "next/navigation";
import { supabaseForRequest } from "@/lib/supabase/request";
import { isAdminEmail } from "./is-admin";

export class NotAdminError extends Error {
  constructor() {
    super("Not signed in as the admin");
    this.name = "NotAdminError";
  }
}

/** The signed-in admin, verified with Supabase (not just the cookie). */
export async function getAdmin() {
  const supabase = await supabaseForRequest();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !isAdminEmail(user.email)) return null;
  return { user, supabase };
}

/** For admin pages: send anyone else to the login page. */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** For Server Actions: refuse anyone else. */
export async function assertAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new NotAdminError();
  return admin;
}
