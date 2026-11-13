import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin/is-admin";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/auth/callback"];

/**
 * Guards /admin: refreshes the Supabase session cookie and sends anyone who
 * is not the admin to the login page. (Every admin page and Server Action
 * checks again on the server, and Row Level Security checks a third time.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isPublic = PUBLIC_ADMIN_PATHS.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  if (!url || !key) {
    return isPublic
      ? response
      : NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const admin = isAdminEmail(data.user?.email);

  if (!isPublic && !admin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (request.nextUrl.pathname === "/admin/login" && admin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
