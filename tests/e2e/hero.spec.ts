import { expect, test, type Page } from "@playwright/test";

const WIDTHS = [320, 375, 640, 768, 1024, 1920];

async function headingMetrics(page: Page) {
  return page.locator("h1").evaluate((h1) => {
    const range = document.createRange();
    range.selectNodeContents(h1);
    const text = range.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(h1).fontSize);
    return {
      lines: Math.round(h1.getBoundingClientRect().height / fontSize),
      textLeft: text.left,
      textRight: text.right,
      viewport: window.innerWidth,
    };
  });
}

test.describe("hero", () => {
  for (const width of WIDTHS) {
    test(`heading fits on one line at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);

      const m = await headingMetrics(page);
      expect(m.lines).toBe(1);
      // fully visible: not clipped by the overflow-hidden wrapper
      expect(m.textLeft).toBeGreaterThanOrEqual(0);
      expect(m.textRight).toBeLessThanOrEqual(m.viewport);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("shows nav, tagline and contact button after the entrance animation", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/motion/);
    // every FadeIn finishes and leaves its content fully visible
    await expect(page.locator('[data-fade="pending"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Hi, i’m Rafay",
    );
    await expect(page.locator("h1")).toHaveCSS("opacity", "1");

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(
      nav.getByRole("link", { name: "Rafay", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "an AI engineer building automations, AI products and websites that work",
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact Me" })).toBeVisible();
  });

  test("reduced motion: content is visible immediately, no animation", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/motion/);
    await expect(page.locator("header").first()).toHaveCSS("opacity", "1");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("plain mode toggle turns motion off and is remembered", async ({
    page,
  }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /plain mode/i });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveClass(/plain/);
    await expect(page.locator("html")).not.toHaveClass(/motion/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/plain/);
    await expect(page.locator("html")).not.toHaveClass(/motion/);
    await expect(
      page.getByRole("button", { name: /plain mode/i }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("toggle is reachable by keyboard", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /plain mode/i });
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
