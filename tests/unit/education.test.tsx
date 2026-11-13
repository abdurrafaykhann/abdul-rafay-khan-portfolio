import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FIXTURE_CONTENT } from "@/components/dev/fixtures";
import { Education } from "@/components/sections/Education";
import { featuredEducation, visibleSections } from "@/lib/data/select";
import { EMPTY_CONTENT, type EducationEntry } from "@/lib/data/types";

const [withPhotos, plain] = FIXTURE_CONTENT.education;
const skills = FIXTURE_CONTENT.site.skills;

describe("Education selectors", () => {
  it("featured entry is the first one with a photo or certificate", () => {
    expect(featuredEducation(FIXTURE_CONTENT)?.id).toBe("edu-1");
    expect(
      featuredEducation({ ...FIXTURE_CONTENT, education: [plain] }),
    ).toBeNull();
  });

  it("section shows with education or skills, and hides with neither", () => {
    expect(visibleSections(EMPTY_CONTENT).education).toBe(false);
    expect(
      visibleSections({ ...EMPTY_CONTENT, education: [plain] }).education,
    ).toBe(true);
    expect(
      visibleSections({
        ...EMPTY_CONTENT,
        site: { ...EMPTY_CONTENT.site, skills },
      }).education,
    ).toBe(true);
  });
});

describe("Education", () => {
  it("shows the photo and degree, every entry, and grouped skills", () => {
    const { container } = render(
      <Education
        entries={[withPhotos, plain]}
        featured={withPhotos}
        skills={skills}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Education" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Fixture photo")).toBeInTheDocument();
    expect(screen.getByAltText("Fixture certificate")).toBeInTheDocument();

    const rows = within(container.querySelector("ol")!).getAllByRole(
      "listitem",
    );
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("01")).toBeInTheDocument();
    expect(
      within(rows[0]).getByText("Fixture University · 2023 – 2026"),
    ).toBeInTheDocument();
    // no grade → no grade badge
    expect(within(rows[1]).queryByText(/grade/i)).not.toBeInTheDocument();

    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByText("Fixture Group A")).toBeInTheDocument();
    expect(screen.getByText("Fixture 5")).toBeInTheDocument();
  });

  it("without photos: no image block and no placeholder", () => {
    const { container } = render(
      <Education entries={[plain]} featured={null} skills={[]} />,
    );
    expect(container.querySelector("[data-education-featured]")).toBeNull();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Skills")).not.toBeInTheDocument();
  });

  it("uses a sensible alt text when none was entered", () => {
    const entry: EducationEntry = {
      ...withPhotos,
      photo: { url: "/education/graduation.webp", alt: "" },
      certificate: { url: "/education/degree.webp", alt: "" },
    };
    render(<Education entries={[entry]} featured={entry} skills={[]} />);
    expect(
      screen.getByAltText("Fixture Degree graduation"),
    ).toBeInTheDocument();
    expect(
      screen.getByAltText("Fixture Degree degree certificate"),
    ).toBeInTheDocument();
  });
});
