import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { secretMatches } from "@/lib/secret";

/**
 * Draft preview for the admin: shows unpublished projects on the real site.
 *   /api/draft?secret=<DRAFT_PREVIEW_SECRET>   turn on
 *   /api/draft?exit=1                          turn off
 * (From M4 the admin dashboard opens this for you.)
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const draft = await draftMode();

  if (params.get("exit")) {
    draft.disable();
    redirect("/");
  }

  if (!secretMatches(params.get("secret"), process.env.DRAFT_PREVIEW_SECRET)) {
    return new Response("Invalid preview link", { status: 401 });
  }
  draft.enable();
  redirect("/");
}
