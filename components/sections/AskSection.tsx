import { AskChatLazy } from "@/components/ask/AskChatLazy";
import { FadeIn } from "@/components/motion/FadeIn";

/** "Ask my AI" on the page itself (the floating button opens the same chat). */
export function AskSection() {
  return (
    <section
      id="ask"
      aria-labelledby="ask-heading"
      className="bg-ink px-5 pt-20 sm:px-8 sm:pt-24 md:px-10 md:pt-32"
    >
      <FadeIn delay={0} y={40}>
        <h2
          id="ask-heading"
          className="hero-heading mb-8 text-center leading-none font-black tracking-tight uppercase sm:mb-12"
          style={{ fontSize: "clamp(2.5rem, 9vw, 120px)" }}
        >
          Ask my AI
        </h2>
      </FadeIn>
      <FadeIn delay={0.1} className="mx-auto max-w-3xl">
        <p className="text-mist mb-8 text-center font-light">
          Ask anything about my projects, skills or background. Answers come
          only from the content on this site, with links to the case studies.
        </p>
        <AskChatLazy />
      </FadeIn>
    </section>
  );
}
