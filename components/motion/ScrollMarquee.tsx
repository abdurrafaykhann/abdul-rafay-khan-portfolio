"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import {
  MAX_PLAYING,
  ROW_REPEATS,
  fillRows,
  marqueeOffset,
  pickPlaying,
  rowTranslateX,
  type MarqueeItem,
  type VisibleClip,
} from "@/lib/marquee";
import { useMotionEnabled } from "@/lib/motion/use-motion";

const TILE = "h-[270px] w-[420px] shrink-0 rounded-2xl object-cover";

function Tile({ item, tileKey }: { item: MarqueeItem; tileKey: string }) {
  if (item.type === "video") {
    return (
      <video
        data-clip={tileKey}
        data-src={item.src}
        poster={item.poster}
        aria-label={item.alt}
        muted
        loop
        playsInline
        preload="none"
        className={TILE}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={item.alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={TILE}
    />
  );
}

/**
 * Two rows of clips that slide in opposite directions as the page scrolls
 * (template maths, GSAP-driven). Videos show their poster until on screen;
 * at most MAX_PLAYING play at once and all pause when offscreen.
 * Renders nothing when there are no clips.
 */
export function ScrollMarquee({ items }: { items: MarqueeItem[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();
  const rows = fillRows(items);
  const hasRows = rows !== null;

  // Scroll-driven horizontal movement
  useEffect(() => {
    const section = sectionRef.current;
    const row1 = row1Ref.current;
    const row2 = row2Ref.current;
    if (!section || !row1 || !row2 || !motion) return;

    const setRow1 = gsap.quickSetter(row1, "x", "px");
    const setRow2 = gsap.quickSetter(row2, "x", "px");
    const update = () => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const offset = marqueeOffset(
        window.scrollY,
        sectionTop,
        window.innerHeight,
      );
      setRow1(rowTranslateX(offset, 0));
      setRow2(rowTranslateX(offset, 1));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      gsap.set([row1, row2], { clearProps: "transform" });
    };
  }, [motion, hasRows]);

  // Play only on-screen clips, never more than MAX_PLAYING
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !motion) return;
    const videos = Array.from(
      section.querySelectorAll<HTMLVideoElement>("video[data-clip]"),
    );
    if (videos.length === 0) return;

    const onScreen = new Set<HTMLVideoElement>();
    let frame = 0;

    const apply = () => {
      frame = 0;
      const visible: VisibleClip[] = [];
      const byKey = new Map<string, HTMLVideoElement>();
      for (const video of onScreen) {
        const r = video.getBoundingClientRect();
        const key = video.dataset.clip!;
        byKey.set(key, video);
        visible.push({
          key,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2,
        });
      }
      const playing = new Set(
        pickPlaying(
          visible,
          { width: window.innerWidth, height: window.innerHeight },
          MAX_PLAYING,
        ),
      );
      for (const video of videos) {
        if (playing.has(video.dataset.clip!)) {
          if (!video.src && video.dataset.src) video.src = video.dataset.src;
          if (video.paused) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) onScreen.add(video);
          else onScreen.delete(video);
        }
        schedule();
      },
      { threshold: 0.2 },
    );
    videos.forEach((video) => io.observe(video));
    // rows slide sideways while scrolling, so the closest clips change
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      if (frame) cancelAnimationFrame(frame);
      videos.forEach((video) => video.pause());
    };
  }, [motion, hasRows]);

  if (!rows) return null;

  return (
    <section
      ref={sectionRef}
      aria-label="Project clips"
      className="bg-ink flex flex-col gap-3 overflow-hidden pt-24 pb-10 sm:pt-32 md:pt-40"
    >
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          ref={rowIndex === 0 ? row1Ref : row2Ref}
          data-marquee-row={rowIndex + 1}
          className="relative left-1/2 flex w-max -translate-x-1/2 gap-3"
          style={{ willChange: "transform" }}
        >
          {Array.from({ length: ROW_REPEATS }, (_, repeat) =>
            row.map((item, i) => {
              const tileKey = `${rowIndex}-${repeat}-${i}`;
              return <Tile key={tileKey} tileKey={tileKey} item={item} />;
            }),
          )}
        </div>
      ))}
    </section>
  );
}
