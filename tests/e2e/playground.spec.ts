import { expect, test, type Page } from "@playwright/test";

// The /dev playground exists only on the dev server (never in production
// builds), so these run locally and are skipped in CI, which tests the build.
test.skip(!!process.env.CI, "dev-only playground");

const rowX = (page: Page, row: 1 | 2) =>
  page
    .locator(`[data-marquee-row="${row}"]`)
    .evaluate((el) => el.getBoundingClientRect().left);

const playingCount = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll("video")].filter((v) => !v.paused).length,
  );

test.describe("marquee", () => {
  test("rows slide in opposite directions as the page scrolls", async ({
    page,
  }) => {
    await page.goto("/dev");
    await expect(page.locator("[data-marquee-row]")).toHaveCount(2);

    const before = [await rowX(page, 1), await rowX(page, 2)];
    await page.mouse.wheel(0, 600);
    await expect
      .poll(async () => (await rowX(page, 1)) - before[0])
      .toBeGreaterThan(100);
    const after = [await rowX(page, 1), await rowX(page, 2)];

    const moved1 = after[0] - before[0];
    const moved2 = after[1] - before[1];
    expect(moved1).toBeGreaterThan(0); // row 1 → right
    expect(moved2).toBeLessThan(0); // row 2 → left
    expect(moved1).toBeCloseTo(-moved2, 0);
    expect(moved1).toBeCloseTo(600 * 0.3, 0); // template factor
  });

  test("plays on-screen clips only, never more than 6, and pauses offscreen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto("/dev");
    await expect(page.locator("video").first()).toBeAttached();

    for (const y of [0, 500, 700, 900]) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await expect.poll(() => playingCount(page)).toBeGreaterThan(0);
      expect(await playingCount(page)).toBeLessThanOrEqual(6);
    }

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect.poll(() => playingCount(page)).toBe(0);
  });

  test("plain mode: rows stay still and no clip plays", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("plain-mode", "1"));
    await page.goto("/dev");
    await expect(page.locator("[data-marquee-row]")).toHaveCount(2);
    const before = await rowX(page, 1);
    await page.evaluate(() => window.scrollTo(0, 700));
    await page.waitForTimeout(400);
    expect(await rowX(page, 1)).toBeCloseTo(before, 0);
    expect(await playingCount(page)).toBe(0);
  });
});

test.describe("about", () => {
  const charOpacity = (page: Page, which: "first" | "last") =>
    page.evaluate((w) => {
      const chars = [...document.querySelectorAll("#about [data-char]")];
      const el = w === "first" ? chars[0] : chars[chars.length - 1];
      return Number(getComputedStyle(el).opacity);
    }, which);

  test("text reveals character by character while scrolling", async ({
    page,
  }) => {
    await page.goto("/dev");
    await expect(page.locator("[data-marquee-row]")).toHaveCount(2);
    // before the paragraph reaches the viewport everything is dim
    await expect.poll(() => charOpacity(page, "first")).toBeCloseTo(0.2, 1);

    // paragraph in the middle of the screen: start lit, end still dim
    await page.locator("#about p").evaluate((p) => {
      const r = p.getBoundingClientRect();
      window.scrollTo(
        0,
        window.scrollY + r.top + r.height / 2 - window.innerHeight / 2,
      );
    });
    await expect.poll(() => charOpacity(page, "first")).toBe(1);
    expect(await charOpacity(page, "last")).toBeLessThan(1);

    // scrolled past: fully lit
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect.poll(() => charOpacity(page, "last")).toBe(1);
  });

  test("loads the four 3D objects only when the section is near", async ({
    page,
  }) => {
    await page.goto("/dev");
    await expect(page.locator("[data-about-object]")).toHaveCount(4);
    await expect(page.locator("#about canvas")).toHaveCount(0);

    await page.locator("#about").scrollIntoViewIfNeeded();
    await page
      .locator("#about")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(page.locator("#about canvas")).toHaveCount(4);
  });

  test("reduced motion: full-brightness text and no 3D", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev");
    await page
      .locator("#about")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    expect(await charOpacity(page, "first")).toBe(1);
    expect(await charOpacity(page, "last")).toBe(1);
    await page.waitForTimeout(500);
    await expect(page.locator("#about canvas")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: "About me" }),
    ).toBeVisible();
  });
});
