import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { MatchResultView } from "@/components/match/MatchResultView";
import { StoredMatchSchema } from "@/lib/match/run";
import { serviceSupabase } from "@/lib/supabase/server";
import { site } from "@/lib/site";

// Results are read by their random id on every request (never cached or indexed).
export const instant = false;

export const metadata: Metadata = {
  title: `Role match — ${site.shortName}`,
  robots: { index: false, follow: false },
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = serviceSupabase();
  if (!db) notFound();

  const { data } = await db
    .from("matches")
    .select("result")
    .eq("id", id)
    .maybeSingle();
  const parsed = StoredMatchSchema.safeParse(data?.result);
  if (!parsed.success) notFound();

  return (
    <div className="bg-ink min-h-svh px-5 pt-24 pb-20 sm:px-8">
      <header className="text-mist fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-6 text-sm font-medium tracking-wider uppercase md:px-10 md:pt-8 md:text-lg">
        <Link
          href="/"
          className="font-bold transition-opacity hover:opacity-70"
        >
          {site.shortName}
        </Link>
        <Link href="/#work" className="transition-opacity hover:opacity-70">
          All work
        </Link>
      </header>
      <main id="main">
        <MatchResultView result={parsed.data} />
      </main>
    </div>
  );
}
