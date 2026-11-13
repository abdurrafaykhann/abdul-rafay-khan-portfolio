"use client";

import { Children, useEffect, useRef, type ReactNode } from "react";
import { ScrollTrigger, gsap } from "@/lib/gsap-scroll";
import { useMotionEnabled } from "@/lib/motion/use-motion";
import { STACK_OFFSET_PX, cardScale } from "@/lib/stacking";

/**
 * Sticky stacking cards (GSAP port of the template): each child sticks near
 * the top of the screen and scales down slightly as later cards slide over it.
 * Without motion the cards still stack; they just don't scale.
 */
export function StackingCards({ children }: { children: ReactNode }) {
  const stackRef = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();
  const cards = Children.toArray(children);
  const total = cards.length;

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || !motion || total === 0) return;
    const els = Array.from(
      stack.querySelectorAll<HTMLElement>("[data-stack-card]"),
    );

    const trigger = ScrollTrigger.create({
      trigger: stack,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        els.forEach((el, i) =>
          gsap.set(el, { scale: cardScale(self.progress, i, total) }),
        );
      },
    });
    return () => {
      trigger.kill();
      gsap.set(els, { clearProps: "transform" });
    };
  }, [motion, total]);

  return (
    <div ref={stackRef}>
      {cards.map((card, i) => (
        // min-h (not h): a card taller than 85vh grows its slot instead of
        // spilling over whatever follows the stack. The 28px step is padding
        // for the same reason.
        <div
          key={i}
          className="sticky top-24 min-h-[85vh] md:top-32"
          style={{ paddingTop: `${i * STACK_OFFSET_PX}px` }}
        >
          <div
            data-stack-card
            className="origin-top"
            style={{ willChange: "transform" }}
          >
            {card}
          </div>
        </div>
      ))}
    </div>
  );
}
