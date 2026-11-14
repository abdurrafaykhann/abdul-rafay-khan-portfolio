import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MatchResultView } from "@/components/match/MatchResultView";
import { StoredMatchSchema } from "@/lib/match/run";

const result = {
  jobTitle: "ML Engineer",
  company: "Acme",
  summary: "Good fit.",
  topProjects: [
    { slug: "sentinel", title: "Sentinel", reason: "Vision work." },
  ],
  matchedSkills: ["PyTorch"],
  gaps: ["Kubernetes"],
};

describe("MatchResultView", () => {
  it("shows the role, projects linked to their case studies, skills and gaps", () => {
    render(<MatchResultView result={result} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "ML Engineer at Acme",
    );
    expect(screen.getByRole("link", { name: "Sentinel" })).toHaveAttribute(
      "href",
      "/work/sentinel",
    );
    expect(screen.getByText("PyTorch")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
    expect(
      screen.getByText(/job description was not saved/i),
    ).toBeInTheDocument();
  });

  it("copes with no title, projects, skills or gaps", () => {
    render(
      <MatchResultView
        result={{
          jobTitle: null,
          company: null,
          summary: "No close match.",
          topProjects: [],
          matchedSkills: [],
          gaps: [],
        }}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Role match",
    );
    expect(screen.queryByText(/Most relevant projects/)).toBeNull();
  });
});

describe("StoredMatchSchema", () => {
  it("accepts a stored result and rejects junk", () => {
    expect(StoredMatchSchema.safeParse(result).success).toBe(true);
    expect(StoredMatchSchema.safeParse({ summary: 3 }).success).toBe(false);
    expect(StoredMatchSchema.safeParse(null).success).toBe(false);
  });
});
