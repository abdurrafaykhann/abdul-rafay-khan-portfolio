"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FadeIn } from "@/components/motion/FadeIn";

const MAX = 6000;

/** Paste a job description, get a shareable page showing how my work fits it. */
export function MatchSection() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [state, setState] = useState<
    { status: "idle" | "working" } | { status: "error"; message: string }
  >({ status: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "working" });
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jd }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (res.ok && body.id) {
        router.push(`/match/${body.id}`);
        return;
      }
      setState({
        status: "error",
        message:
          res.status === 503 && body.error === "unavailable"
            ? "The matcher isn't available right now."
            : (body.error ?? "Something went wrong. Please try again."),
      });
    } catch {
      setState({
        status: "error",
        message: "Couldn't reach the matcher. Check your connection.",
      });
    }
  }

  return (
    <section
      id="match"
      aria-labelledby="match-heading"
      className="bg-ink px-5 pt-20 sm:px-8 sm:pt-24 md:px-10 md:pt-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          id="match-heading"
          className="hero-heading mb-8 text-center leading-none font-black tracking-tight uppercase sm:mb-12"
          style={{ fontSize: "clamp(2.5rem, 9vw, 120px)" }}
        >
          Hiring?
        </h2>
      </FadeIn>
      <FadeIn delay={0.1} className="mx-auto max-w-3xl">
        <p className="text-mist mb-8 text-center font-light">
          Paste a job description and see which of my projects and skills fit
          it, and where they don&rsquo;t. You get a page you can share. Your
          text is used once and not saved.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="sr-only" htmlFor="jd">
            Job description
          </label>
          <textarea
            id="jd"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            maxLength={MAX}
            rows={8}
            placeholder="Paste the job description here…"
            className="w-full resize-y rounded-[28px] border-2 border-[#D7E2EA]/40 bg-transparent px-6 py-4 text-base text-[#D7E2EA] outline-none placeholder:text-[#D7E2EA]/40 focus:border-[#D7E2EA]"
          />
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={state.status === "working" || jd.trim().length < 40}
              className="inline-block cursor-pointer rounded-full px-10 py-3.5 text-sm font-medium tracking-widest text-white uppercase transition-[filter] duration-200 hover:brightness-110 disabled:opacity-60"
              style={{
                background:
                  "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
                boxShadow:
                  "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
                outline: "2px solid #FFFFFF",
                outlineOffset: "-3px",
              }}
            >
              {state.status === "working" ? "Matching…" : "Match my work"}
            </button>
            <span className="text-sm text-[#D7E2EA]/50">
              {jd.length.toLocaleString("en-GB")} /{" "}
              {MAX.toLocaleString("en-GB")}
            </span>
          </div>
          <p
            role="alert"
            aria-live="polite"
            className="min-h-6 text-sm text-red-300"
          >
            {state.status === "error" ? state.message : ""}
          </p>
        </form>
      </FadeIn>
    </section>
  );
}
