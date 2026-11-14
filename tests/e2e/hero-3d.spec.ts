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
      page.getByAltText(/portrait of abdul rafay khan/i),
    ).toBeVisible();

    await expect
      .poll(() => phase(page), { timeout: 30_000 })
      .toMatch(/intro|crossfade|settled/);
    await expect.poll(() => phase(page), { timeout: 10_000 }).toBe("settled");
    await expect(page.locator("[data-hero-3d] canvas")).toBeAttached();
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
    await expect.poll(() => phase(page), { timeout: 30_000 }).toBe("intro");
    const t0 = Date.now();
    await page.mouse.click(10, 400);
    await expect.poll(() => phase(page), { timeout: 5_000 }).toBe("settled");
    expect(Date.now() - t0).toBeLessThan(1500); // the full intro would take ~2 s
  });

  test("plain mode keeps the static photo, no 3D", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("plain-mode", "1"));
    await page.goto("/");
    await page.waitForTimeout(3000);
    expect(await phase(page)).toBe("off");
    await expect(page.locator("[data-hero-3d] canvas")).toHaveCount(0);
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
    await expect(page.locator("[data-hero-3d] canvas")).toHaveCount(0);
  });
});
