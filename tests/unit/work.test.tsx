import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FIXTURE_CONTENT } from "@/components/dev/fixtures";
import { WhatIDo } from "@/components/sections/WhatIDo";
import { Work } from "@/components/sections/Work";
import { ProjectStackCard } from "@/components/work/ProjectStackCard";
import { whatIDoCategories } from "@/lib/data/select";
import { ALL, workFilter } from "@/lib/work-filter";

afterEach(() => act(() => workFilter.set(ALL)));

const visibleCards = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>("[data-project-card]")].filter(
    (el) => !el.hidden,
  );

describe("WhatIDo", () => {
  const categories = whatIDoCategories(FIXTURE_CONTENT);

  it("lists categories with number, description and stack", () => {
    render(<WhatIDo categories={categories} linkableSlugs={[]} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "What I do" }),
    ).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText("01")).toBeInTheDocument();
    expect(
      within(items[0]).getByText("Fixture Automations"),
    ).toBeInTheDocument();
    expect(within(items[0]).getByText("Fixture A")).toBeInTheDocument();
  });

  it("links to Work only for categories that have projects", () => {
    const { container } = render(
      <WhatIDo categories={categories} linkableSlugs={["fixture-0"]} />,
    );
    const links = container.querySelectorAll("a[href='#work']");
    expect(links).toHaveLength(1);
    fireEvent.click(links[0]);
    expect(workFilter.get()).toBe("fixture-0");
  });
});

describe("ProjectStackCard", () => {
  it("shows number, type, name, buttons, badges and images", () => {
    const project = FIXTURE_CONTENT.projects[0];
    render(<ProjectStackCard project={project} index={0} typeLabel="Client" />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Fixture Project 1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Live Project" })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.queryByText("hidden metric")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("leaves out whatever has no data (no buttons, badges or images)", () => {
    const project = {
      ...FIXTURE_CONTENT.projects[5],
      links: {},
      metrics: [],
      images: { leftTop: null, leftBottom: null, right: null },
    };
    render(<ProjectStackCard project={project} index={4} typeLabel={null} />);
    expect(screen.getByText("05")).toBeInTheDocument();
    // no Live Project / GitHub buttons; only the title links to the case study
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", `/work/${project.slug}`);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("Work", () => {
  it("renders key projects as stacking cards and all projects in the grid", () => {
    const { container } = render(<Work content={FIXTURE_CONTENT} overlap />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Work" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("[data-stack-card]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-project-card]")).toHaveLength(15);
  });

  it("shows 12 projects, then the rest after Load more", () => {
    const { container } = render(<Work content={FIXTURE_CONTENT} overlap />);
    expect(visibleCards(container)).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(visibleCards(container)).toHaveLength(15);
    expect(
      screen.queryByRole("button", { name: "Load more" }),
    ).not.toBeInTheDocument();
  });

  it("filters by category and only offers categories that have projects", () => {
    const { container } = render(<Work content={FIXTURE_CONTENT} overlap />);
    const bar = screen.getByRole("group", { name: /filter projects/i });
    expect(
      within(bar)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([
      "All",
      "Fixture Automations",
      "Fixture Agents",
      "Fixture Websites",
    ]);

    fireEvent.click(
      within(bar).getByRole("button", { name: "Fixture Agents" }),
    );
    expect(
      within(bar).getByRole("button", { name: "Fixture Agents" }),
    ).toHaveAttribute("aria-pressed", "true");
    // projects 1, 4, 7, 10, 13 have primary category index 1
    expect(visibleCards(container)).toHaveLength(5);

    fireEvent.click(within(bar).getByRole("button", { name: "All" }));
    expect(visibleCards(container)).toHaveLength(12);
  });

  it("status badge appears only when the project enables it", () => {
    const { container } = render(<Work content={FIXTURE_CONTENT} overlap />);
    const cards = container.querySelectorAll<HTMLElement>(
      "[data-project-card]",
    );
    expect(within(cards[0]).getByText("Live")).toBeInTheDocument(); // badge on
    expect(within(cards[3]).queryByText("Live")).not.toBeInTheDocument(); // badge off
    expect(within(cards[1]).getByText("Completed")).toBeInTheDocument();
    expect(within(cards[2]).getByText("In progress")).toBeInTheDocument();
  });

  it("has no stacking area when no project is marked key", () => {
    const content = {
      ...FIXTURE_CONTENT,
      projects: FIXTURE_CONTENT.projects.map((p) => ({ ...p, isKey: false })),
    };
    const { container } = render(<Work content={content} overlap={false} />);
    expect(container.querySelector("[data-key-projects]")).toBeNull();
  });
});
