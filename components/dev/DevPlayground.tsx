"use client";

import { useEffect, useState } from "react";
import { ScrollMarquee } from "@/components/motion/ScrollMarquee";
import { About } from "@/components/sections/About";
import { WhatIDo } from "@/components/sections/WhatIDo";
import { Work } from "@/components/sections/Work";
import { Education } from "@/components/sections/Education";
import {
  featuredEducation,
  filterCategories,
  whatIDoCategories,
} from "@/lib/data/select";
import type { MarqueeItem } from "@/lib/marquee";
import { FIXTURE_CONTENT, fixtureImage } from "./fixtures";

/**
 * DEV-ONLY playground (never part of the production build).
 * Lets every content-driven section be reviewed before real content exists.
 * All media and text here is generated and labelled as a fixture.
 */

/** Records ~1 s of an animated canvas as a WebM clip (blob URL). */
async function fixtureVideo(): Promise<string | null> {
  if (typeof MediaRecorder === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 420;
  canvas.height = 270;
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.captureStream) return null;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<string>((resolve) => {
    recorder.onstop = () =>
      resolve(URL.createObjectURL(new Blob(chunks, { type: "video/webm" })));
  });

  recorder.start();
  const started = performance.now();
  await new Promise<void>((resolve) => {
    const draw = () => {
      const t = (performance.now() - started) / 1000;
      ctx.fillStyle = "#18011F";
      ctx.fillRect(0, 0, 420, 270);
      ctx.fillStyle = "#B600A8";
      ctx.fillRect((t * 420) % 420, 0, 60, 270);
      ctx.fillStyle = "#fff";
      ctx.font = "700 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("DEV FIXTURE VIDEO", 210, 140);
      if (t < 1) setTimeout(draw, 33);
      else resolve();
    };
    draw();
  });
  recorder.stop();
  return done;
}

export function DevPlayground() {
  const [items, setItems] = useState<MarqueeItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fixtureVideo().then((videoUrl) => {
      if (cancelled) return;
      setItems(
        Array.from({ length: 9 }, (_, n): MarqueeItem => {
          // every other tile is a video, the rest are images
          const isVideo = videoUrl !== null && n % 2 === 0;
          return isVideo
            ? {
                id: `fixture-${n}`,
                type: "video",
                src: videoUrl,
                poster: fixtureImage(n),
                alt: `Dev fixture clip ${n + 1}`,
              }
            : {
                id: `fixture-${n}`,
                type: "image",
                src: fixtureImage(n),
                alt: `Dev fixture image ${n + 1}`,
              };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-ink" style={{ overflowX: "clip" }}>
      <div className="text-mist flex h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm tracking-widest uppercase opacity-60">
          Dev playground · local only
        </p>
        <h1 className="text-3xl font-bold">Marquee and About preview</h1>
        <p className="max-w-md opacity-70">
          Scroll down. Everything on this page is generated fixture media, not
          real content.
        </p>
      </div>
      <ScrollMarquee items={items} />
      <About text={FIXTURE_CONTENT.site.aboutText!} />
      <WhatIDo
        categories={whatIDoCategories(FIXTURE_CONTENT)}
        linkableSlugs={filterCategories(FIXTURE_CONTENT).map((c) => c.slug)}
      />
      <Work content={FIXTURE_CONTENT} overlap />
      <Education
        entries={FIXTURE_CONTENT.education}
        featured={featuredEducation(FIXTURE_CONTENT)}
        skills={FIXTURE_CONTENT.site.skills}
      />
      <div className="h-[30vh]" />
    </main>
  );
}
