"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap-scroll";
import { useMotionEnabled } from "@/lib/motion/use-motion";
import { splitIntoWords } from "@/lib/split-text";

type AnimatedTextProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Character-by-character scroll reveal (template values): each character goes
 * from opacity 0.2 to 1 in turn while the paragraph travels from
 * "top at 80% of the viewport" to "bottom at 20%".
 * Without motion the text is simply fully visible.
 */
export function AnimatedText({ text, className, style }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const motion = useMotionEnabled();
  const words = useMemo(() => splitIntoWords(text), [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motion) return;
    const chars = el.querySelectorAll("[data-char]");
    if (chars.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { opacity: 0.2 },
        {
          opacity: 1,
          ease: "none",
          duration: 1,
          stagger: 1, // one character after another, evenly across the scroll
          scrollTrigger: {
            trigger: el,
            start: "top 80%",
            end: "bottom 20%",
            scrub: true,
          },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [motion, text]);

  return (
    <p ref={ref} aria-label={text} className={className} style={style}>
      {words.map((chars, w) => (
        <span key={w} aria-hidden>
          <span className="inline-block whitespace-nowrap">
            {chars.map((char, c) => (
              <span key={c} data-char>
                {char}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </p>
  );
}
