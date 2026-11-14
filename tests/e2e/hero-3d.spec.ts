import { expect, test, type Page } from "@playwright/test";

/** The 3D hero portrait: particle intro → depth-parallax photo. */

const phase = (page: Page) =>
  page.locator("[data-hero-3d]").getAttribute("data-hero-3d");

test.describe("hero 3D portrait", () => {
  test("plays the particle intro once, then settles on the depth photo", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    // the static photo is there from the first paint
    await expect(
      page.getByAltText(/portrait of abdul rafay khan/i).first(),
    ).toBeVisible();

    await expect
      .poll(() => phase(page), { timeout: 30_000 })
      .toMatch(/intro|crossfade|settled/);
    await expect.poll(() => phase(page), { timeout: 10_000 }).toBe("settled");
    await expect(page.locator("#hero-stage canvas")).toBeAttached();
    expect(
      await page.evaluate(() => sessionStorage.getItem("hero-intro-played")),
    ).toBe("1");

    // same session: no intro again, straight to the depth photo
    await page.reload();
    await expect.poll(() => phase(page), { timeout: 30_000 }).toBe("settled");
  });

  test("a click skips the intro", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/");
    await expect
      .poll(() => phase(page), { timeout: 30_000 })
      .toMatch(/intro|crossfade|settled/);
    await page.mouse.click(10, 400);
    await expect.poll(() => phase(page), { timeout: 20_000 }).toBe("settled");
  });

  test("plain mode keeps the static photo, no 3D", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("plain-mode", "1"));
    await page.goto("/");
    await page.waitForTimeout(3000);
    expect(await phase(page)).toBe("off");
    await expect(page.locator("#hero-stage canvas")).toHaveCount(0);
    await expect(page.getByAltText(/portrait of abdul rafay khan/i)).toHaveCSS(
      "opacity",
      "1",
    );
  });

  test("reduced motion keeps the static photo, no 3D", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForTimeout(3000);
    expect(await phase(page)).toBe("off");
    await expect(page.locator("#hero-stage canvas")).toHaveCount(0);
  });
});

/** The pinned, scroll-driven sequence on top of the 3D portrait. */
test.describe("cinematic scroll sequence", () => {
  const settle = async (page: Page) => {
    await page.goto("/");
    await expect.poll(() => phase(page), { timeout: 30_000 }).toBe("settled");
  };
  const track = (page: Page) =>
    page.evaluate(() => {
      const t = document.querySelector<HTMLElement>("[data-hero-track]")!;
      return { mode: t.dataset.heroTrack, height: t.offsetHeight };
    });
  const finalOpacity = (page: Page) =>
    page
      .locator("[data-hero-final]")
      .evaluate((el) => Number(getComputedStyle(el).opacity));
  const heroTop = (page: Page) =>
    page
      .locator("#top")
      .evaluate((el) => Math.round(el.getBoundingClientRect().top));

  test("pins the hero, reveals the final line at the end, and reverses", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await settle(page);
    const t = await track(page);
    expect(t.mode).toBe("desktop");
    expect(t.height).toBeGreaterThan(900 * 3); // pinned for extra scroll
    expect(await finalOpacity(page)).toBe(0);
    const travel = t.height - 900;

    // halfway: still pinned to the top, final line not yet shown
    await page.evaluate((y) => window.scrollTo(0, y), travel * 0.5);
    await page.waitForTimeout(1200);
    expect(await heroTop(page)).toBe(0);
    expect(await finalOpacity(page)).toBe(0);

    // the end: final reveal
    await page.evaluate((y) => window.scrollTo(0, y), travel);
    await expect.poll(() => finalOpacity(page), { timeout: 5000 }).toBe(1);
    expect(await heroTop(page)).toBe(0);
    await expect(page.locator("[data-hero-final]")).toHaveText(
      /AI Engineering × Agentic AI × Full-Stack Development/,
    );

    // scrolling back up reverses it
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => finalOpacity(page), { timeout: 5000 }).toBe(0);

    // and past the track the page carries on normally
    await page.evaluate((y) => window.scrollTo(0, y), t.height + 300);
    await page.waitForTimeout(500);
    expect(await heroTop(page)).toBeLessThan(0);
  });

  test("phones get a shorter sequence", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page);
    const t = await track(page);
    expect(t.mode).toBe("mobile");
    expect(t.height).toBeLessThan(844 * 3);
    expect(t.height).toBeGreaterThan(844 * 2);
  });

  test("plain mode and reduced motion: an ordinary hero, no pinning", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForTimeout(3000);
    const t = await track(page);
    expect(t.mode).toBe("static");
    expect(t.height).toBe(900);
    expect(await finalOpacity(page)).toBe(0);
  });
});
