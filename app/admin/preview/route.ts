import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";

/**
 * Admin-only draft preview: shows unpublished projects on the real site.
 * (Loading drafts needs SUPABASE_SERVICE_ROLE_KEY on the server.)
 */
export async function GET(request: NextRequest) {
  if (!(await getAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  (await draftMode()).enable();
  return NextResponse.redirect(new URL("/", request.url));
}
