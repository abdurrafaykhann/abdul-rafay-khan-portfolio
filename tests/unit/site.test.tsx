import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "@/components/sections/Hero";
import { site } from "@/lib/site";

const links = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Ask AI", href: "#ask-ai" },
  { label: "Contact", href: "#contact" },
];

describe("site identity", () => {
  it("uses the agreed page title and default tagline", () => {
    expect(site.title).toBe("Abdul Rafay Khan — AI Engineer");
    expect(site.defaultTagline).toBe(
      "an AI engineer building automations, AI products and websites that work",
    );
  });
});

describe("Hero", () => {
  it("renders heading, nav, tagline and contact button", () => {
    render(<Hero links={links} tagline="my tagline" portrait={null} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Hi, i’m Rafay" }),
    ).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    for (const { label, href } of links) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }
    expect(screen.getByText("my tagline")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact Me" })).toHaveAttribute(
      "href",
      "#contact",
    );
  });

  it("shows no portrait (and no placeholder) until a photo exists", () => {
    render(<Hero links={links} tagline="t" portrait={null} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the portrait with alt text when a photo exists", () => {
    render(
      <Hero
        links={links}
        tagline="t"
        portrait={{
          photo: "/hero/portrait.webp",
          depth: null,
          particles: null,
        }}
      />,
    );
    const img = screen.getByRole("img", {
      name: "Portrait of Abdul Rafay Khan",
    });
    expect(img).toHaveAttribute("src", "/hero/portrait.webp");
  });
});
