"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { EASE_FADE, gsap } from "@/lib/gsap";
import { useMotionEnabled } from "@/lib/motion/use-motion";

type FadeInProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** seconds */
  delay?: number;
  /** seconds */
  duration?: number;
  /** starting offset in px */
  x?: number;
  y?: number;
  /**
   * Above-the-fold content: the entrance runs as a pure CSS animation, so it
   * does not wait for JavaScript to load (this keeps the main image's paint
   * fast). Same look and timing; no scroll trigger.
   */
  css?: boolean;
};

/**
 * Fades + slides content in the first time it enters the viewport
 * (template values: 0.7 s, cubic-bezier(.25,.1,.25,1), 50 px margin, once).
 * Hidden state comes from CSS (`html.motion [data-fade="pending"]`), so with
 * plain mode / reduced motion / no JS the content is simply visible.
 */
export function FadeIn({
  as: Tag = "div",
  children,
  className,
  style,
  delay = 0,
  duration = 0.7,
  x = 0,
  y = 30,
  css = false,
}: FadeInProps) {
  const ref = useRef<HTMLElement>(null);
  const motion = useMotionEnabled();

  useEffect(() => {
    const el = ref.current;
    if (css || !el || !motion || el.dataset.fade === "done") return;

    gsap.set(el, { opacity: 0, x, y });
    let tween: gsap.core.Tween | undefined;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        tween = gsap.to(el, {
          opacity: 1,
          x: 0,
          y: 0,
          duration,
          delay,
          ease: EASE_FADE,
          onComplete: () => {
            el.dataset.fade = "done";
            gsap.set(el, { clearProps: "opacity,transform" });
          },
        });
      },
      { rootMargin: "50px", threshold: 0 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      tween?.kill();
      gsap.set(el, { clearProps: "opacity,transform" });
    };
  }, [motion, delay, duration, x, y, css]);

  return (
    <Tag
      ref={ref}
      data-fade={css ? "css" : "pending"}
      className={className}
      style={
        css
          ? ({
              ...style,
              "--fade-delay": `${delay}s`,
              "--fade-duration": `${duration}s`,
              "--fade-x": `${x}px`,
              "--fade-y": `${y}px`,
            } as CSSProperties)
          : style
      }
    >
      {children}
    </Tag>
  );
}
