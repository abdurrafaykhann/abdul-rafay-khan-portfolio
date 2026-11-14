"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/admin/ui";
import { reindexEverything, type ReindexSummary } from "@/lib/admin/actions";
import type { KnowledgeStatus } from "@/lib/rag/server";

const LABEL: Record<string, string> = {
  project: "Projects",
  category: "What I do",
  about: "About",
  skills: "Skills",
  education: "Education",
};

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "never";

export function KnowledgePanel({ status }: { status: KnowledgeStatus }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ReindexSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [force, setForce] = useState(false);

  const ready = status.databaseReady && status.embeddingKeyReady;

  const run = () =>
    start(async () => {
      setError(null);
      setResult(null);
      const res = await reindexEverything(force);
      if (res.ok) setResult(res.data);
      else setError(res.error);
    });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Knowledge
        </h1>
        <p className="mt-1 text-sm opacity-60">
          What Ask My AI can answer from. Only published content is indexed,
          hidden client names are replaced, and private traction is left out. It
          updates by itself whenever you save; use the button below to rebuild
          it.
        </p>
      </div>

      {!status.databaseReady && (
        <Notice tone="warning">
          SUPABASE_SERVICE_ROLE_KEY is not set on the server, so nothing can be
          indexed.
        </Notice>
      )}
      {!status.embeddingKeyReady && (
        <Notice tone="warning">
          GEMINI_API_KEY is not set on the server. Add it in Vercel (Settings →
          Environment Variables) and redeploy, then re-index.
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-[#D7E2EA]/15 p-5">
          <p className="text-xs tracking-widest uppercase opacity-60">Chunks</p>
          <p className="hero-heading mt-1 text-4xl font-black">
            {status.total}
          </p>
        </div>
        <div className="rounded-3xl border border-[#D7E2EA]/15 p-5 sm:col-span-2">
          <p className="text-xs tracking-widest uppercase opacity-60">
            Last indexed
          </p>
          <p className="mt-2 text-lg">{fmt(status.lastIndexed)}</p>
        </div>
      </div>

      {status.bySource.length > 0 && (
        <div className="overflow-x-auto rounded-3xl border border-[#D7E2EA]/15">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-widest uppercase opacity-60">
              <tr>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 text-right font-medium">Items</th>
                <th className="px-5 py-3 text-right font-medium">Chunks</th>
              </tr>
            </thead>
            <tbody>
              {status.bySource.map((s) => (
                <tr key={s.sourceType} className="border-t border-[#D7E2EA]/10">
                  <td className="px-5 py-3">
                    {LABEL[s.sourceType] ?? s.sourceType}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {s.sources}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {s.chunks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="primary" disabled={pending || !ready} onClick={run}>
          {pending ? "Re-indexing…" : "Re-index everything"}
        </Button>
        <label className="flex items-center gap-2 text-sm opacity-80">
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            disabled={pending}
          />
          Rebuild from scratch (re-embed every chunk)
        </label>
      </div>

      {pending && (
        <Notice>Working… this can take a little while on a large site.</Notice>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {result && (
        <Notice tone="success">
          Done. {result.sources} sources, {result.chunks} chunks: {result.added}{" "}
          added, {result.kept} unchanged, {result.removed} removed.
        </Notice>
      )}
    </div>
  );
}
