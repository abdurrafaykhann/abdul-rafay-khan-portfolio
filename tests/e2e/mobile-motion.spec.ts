import { devices, expect, test } from "@playwright/test";

// A real phone profile: touch screen, 412 px wide.
test.use({ ...devices["Pixel 7"] });

test.describe("phones start with motion off", () => {
  test("no 3D by default, a short tip points at the bolt, and tapping it turns the motion on", async ({
    page,
  }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/plain/);
    await expect(html).not.toHaveClass(/motion/);

    // the ordinary hero: heading and photo are there, no 3D canvas
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(page.locator("#hero-stage canvas")).toHaveCount(0);

    // the tip appears on its own, briefly
    const tip = page.locator("[data-motion-tip]");
    await expect(tip).toBeVisible();
    await expect(tip).toContainText(/turn on the 3D motion/i);

    // using the toggle turns the motion on and ends the tip
    await page.getByRole("button", { name: /plain mode is on/i }).click();
    await expect(html).toHaveClass(/motion/);
    await expect(tip).toHaveCount(0);
    await expect(page.locator("#hero-stage canvas")).toBeVisible({
      timeout: 30_000,
    });

    // the choice is remembered
    await page.reload();
    await expect(html).toHaveClass(/motion/);
    await expect(page.locator("[data-motion-tip]")).toHaveCount(0);
  });

  test("the tip is only a tip: it is gone after a few seconds and does not come back", async ({
    page,
  }) => {
    await page.goto("/");
    const tip = page.locator("[data-motion-tip]");
    await expect(tip).toBeVisible();
    await expect(tip).toHaveCount(0, { timeout: 15_000 });
    await page.reload();
    await page.waitForTimeout(3000);
    await expect(page.locator("[data-motion-tip]")).toHaveCount(0);
    // still plain: nothing was switched on behind the visitor's back
    await expect(page.locator("html")).toHaveClass(/plain/);
  });
});
