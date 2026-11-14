import { adminInsights } from "@/lib/admin/data";

const LABELS: Record<string, string> = {
  "try-it": "Try it",
  live: "Live project",
  github: "GitHub",
  video: "Video",
  demo: "Demo",
  huggingface: "Hugging Face",
  writeup: "Write-up",
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[#D7E2EA]/15 p-5">
      <p className="text-xs tracking-widest uppercase opacity-60">{label}</p>
      <p className="hero-heading mt-1 text-4xl font-black">
        {value.toLocaleString("en-GB")}
      </p>
    </div>
  );
}

export default async function InsightsPage() {
  const i = await adminInsights();
  const empty = i.totalViews === 0 && i.totalClicks === 0;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase">
          Insights
        </h1>
        <p className="mt-1 text-sm opacity-60">
          Anonymous counts of case-study views and link clicks. No IP addresses
          or cookies are stored, and crawlers are ignored. Questions to Ask My
          AI and matched job descriptions will appear here once those features
          are live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Case study views" value={i.totalViews} />
        <Stat label="Views, last 30 days" value={i.viewsLast30Days} />
        <Stat label="Link clicks" value={i.totalClicks} />
      </div>

      {empty ? (
        <p className="rounded-2xl border border-[#D7E2EA]/25 px-4 py-3 text-sm">
          Nothing recorded yet. Views appear once a published project&rsquo;s
          case study is visited.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <section aria-label="Views per project">
            <h2 className="mb-3 text-sm font-medium tracking-widest uppercase opacity-70">
              Per project
            </h2>
            <div className="overflow-x-auto rounded-3xl border border-[#D7E2EA]/15">
              <table className="w-full text-left text-sm">
                <thead className="text-xs tracking-widest uppercase opacity-60">
                  <tr>
                    <th className="px-5 py-3 font-medium">Project</th>
                    <th className="px-5 py-3 text-right font-medium">Views</th>
                    <th className="px-5 py-3 text-right font-medium">
                      30 days
                    </th>
                    <th className="px-5 py-3 text-right font-medium">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {i.perProject.map((p) => (
                    <tr key={p.id} className="border-t border-[#D7E2EA]/10">
                      <td className="px-5 py-3">{p.title}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {p.views}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {p.views30}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {p.clicks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-label="Most clicked links">
            <h2 className="mb-3 text-sm font-medium tracking-widest uppercase opacity-70">
              Most clicked links
            </h2>
            {i.topLinks.length === 0 ? (
              <p className="text-sm opacity-60">No link clicks yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {i.topLinks.map((l) => (
                  <li
                    key={l.target}
                    className="flex justify-between rounded-2xl border border-[#D7E2EA]/15 px-4 py-2.5 text-sm"
                  >
                    <span>{LABELS[l.target] ?? l.target}</span>
                    <span className="tabular-nums">{l.clicks}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
