import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { unreadMessageCount } from "@/lib/admin/data";
import { signOut } from "./sign-out";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Admin pages read the login cookie on every request, so they are never
// prerendered (Next.js 16: allow this route to block on the server).
export const instant = false;

const NAV = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/key-projects", label: "Key projects" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/types", label: "Types" },
  { href: "/admin/marquee", label: "Marquee" },
  { href: "/admin/education", label: "Education" },
  { href: "/admin/site", label: "Site" },
  { href: "/admin/messages", label: "Messages", badge: true },
  { href: "/admin/insights", label: "Insights" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = await requireAdmin();
  const unread = await unreadMessageCount().catch(() => 0);
  return (
    <div className="text-mist min-h-svh">
      <header className="sticky top-0 z-30 border-b border-[#D7E2EA]/10 bg-[#0C0C0C]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <Link
            href="/admin/projects"
            className="font-black tracking-tight uppercase"
          >
            Rafay · Admin
          </Link>
          <nav aria-label="Admin" className="flex flex-wrap gap-4 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="opacity-70 hover:opacity-100"
              >
                {n.label}
                {n.badge && unread > 0 && (
                  <span
                    className="ml-1.5 rounded-full bg-[#B600A8] px-1.5 py-0.5 text-[0.65rem] text-white"
                    aria-label={`${unread} unread`}
                  >
                    {unread}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="opacity-70 hover:opacity-100"
            >
              View site
            </a>
            <a href="/admin/preview" className="opacity-70 hover:opacity-100">
              Preview drafts
            </a>
            <form action={signOut}>
              <button
                type="submit"
                title={user.email ?? undefined}
                className="opacity-70 hover:opacity-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
