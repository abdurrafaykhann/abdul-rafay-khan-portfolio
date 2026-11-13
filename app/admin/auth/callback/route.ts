import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin/is-admin";
import { supabaseForRequest } from "@/lib/supabase/request";

/** Where the magic link lands: turns the link into a session cookie. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const supabase = await supabaseForRequest();
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };
  if (error) return back("/admin/login?error=link");

  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return back("/admin/login?error=denied");
  }
  return back("/admin");
}
