import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";
import { site } from "@/lib/site";

describe("site identity", () => {
  it("uses the agreed page title", () => {
    expect(site.title).toBe("Abdul Rafay Khan — AI Engineer");
  });
});

describe("HomePage shell", () => {
  it("renders a main landmark with the page heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: site.title }),
    ).toBeInTheDocument();
  });
});
