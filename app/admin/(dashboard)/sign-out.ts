"use server";

import { redirect } from "next/navigation";
import { supabaseForRequest } from "@/lib/supabase/request";

export async function signOut() {
  const supabase = await supabaseForRequest();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
