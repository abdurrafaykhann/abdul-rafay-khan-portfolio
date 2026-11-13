import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client bound to the visitor's session cookies (the admin's
 * login). Queries run as that user, so Row Level Security applies.
 */
export async function supabaseForRequest() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies; the proxy refreshes them.
        }
      },
    },
  });
}
