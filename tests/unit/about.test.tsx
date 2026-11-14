import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedText } from "@/components/motion/AnimatedText";
import { About } from "@/components/sections/About";
import { splitIntoWords } from "@/lib/split-text";

describe("splitIntoWords", () => {
  it("splits into words of characters and ignores extra whitespace", () => {
    expect(splitIntoWords("  Hi   there\nyou ")).toEqual([
      ["H", "i"],
      ["t", "h", "e", "r", "e"],
      ["y", "o", "u"],
    ]);
  });

  it("keeps multi-byte characters whole", () => {
    expect(splitIntoWords("I’m 🙂")).toEqual([["I", "’", "m"], ["🙂"]]);
  });

  it("returns nothing for empty text", () => {
    expect(splitIntoWords("   ")).toEqual([]);
  });
});

describe("AnimatedText", () => {
  it("wraps every character and keeps the text readable to screen readers", () => {
    const text = "Agents that work";
    const { container } = render(<AnimatedText text={text} />);
    // screen readers get one plain copy; the animated characters are hidden from them
    expect(
      screen.getByText(text, { selector: ".sr-only" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("[data-char]")).toHaveLength(14);
    container
      .querySelectorAll("[data-char]")
      .forEach((el) => expect(el.closest("[aria-hidden]")).not.toBeNull());
    expect(container.querySelector("p")!.hasAttribute("aria-label")).toBe(
      false,
    );
  });
});

describe("About", () => {
  it("renders the heading, the bio, a contact button and four 3D slots", () => {
    const { container } = render(<About text="My real bio." />);
    expect(
      screen.getByRole("heading", { level: 2, name: "About me" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("My real bio.", { selector: ".sr-only" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contact Me" }),
    ).toBeInTheDocument();

    const slots = [...container.querySelectorAll("[data-about-object]")].map(
      (el) => (el as HTMLElement).dataset.aboutObject,
    );
    expect(slots).toEqual(["neural", "lens", "chat", "cube"]);
    // decorative: hidden from assistive tech
    container
      .querySelectorAll("[data-about-object]")
      .forEach((el) => expect(el).toHaveAttribute("aria-hidden", "true"));
  });
});
