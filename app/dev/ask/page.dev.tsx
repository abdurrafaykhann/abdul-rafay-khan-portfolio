import type { Metadata } from "next";
import { AskLauncher } from "@/components/ask/AskLauncher";
import { AskFixture } from "@/components/dev/AskFixture";
import { MatchResultView } from "@/components/match/MatchResultView";
import { AskSection } from "@/components/sections/AskSection";
import { MatchSection } from "@/components/sections/MatchSection";

export const metadata: Metadata = {
  title: "Ask + matcher (dev)",
  robots: { index: false },
};

/** Development only: the chat, floating button, "Hiring?" box and a match result, with sample data. */
export default function AskDevPage() {
  return (
    <AskFixture>
      <main className="bg-ink min-h-svh pb-32 text-[#D7E2EA]">
        <p className="px-6 pt-6 text-xs tracking-widest uppercase opacity-60">
          Dev preview · scripted answers, no real AI
        </p>
        <AskSection />
        <MatchSection />
        <section className="px-5 pt-24 sm:px-8">
          <h2 className="mb-8 text-center text-sm tracking-widest uppercase opacity-60">
            A shared /match/… page looks like this
          </h2>
          <MatchResultView
            result={{
              jobTitle: "Computer Vision Engineer",
              company: "Acme Robotics",
              summary:
                "Rafay has hands-on experience building video-based deep learning models, shown in his Sentinel project. His skills line up with the core requirements, but he has no documented experience with Kubernetes deployment, Rust or ROS.",
              topProjects: [
                {
                  slug: "sentinel",
                  title: "Sentinel",
                  reason:
                    "A trained video classifier plus face identification, directly matching detection and classification in video.",
                },
                {
                  slug: "docsense",
                  title: "DocSense",
                  reason:
                    "Agents that read and answer questions over documents.",
                },
              ],
              matchedSkills: [
                "Deep Learning",
                "Computer Vision",
                "Model Training",
                "Python",
                "PyTorch",
              ],
              gaps: ["Kubernetes deployment with CI/CD", "Rust", "ROS"],
            }}
          />
        </section>
        <AskLauncher />
      </main>
    </AskFixture>
  );
}
