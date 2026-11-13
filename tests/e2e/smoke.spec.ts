import { expect, test } from "@playwright/test";

test("home page loads with the right title, theme and font", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Abdul Rafay Khan — AI Engineer");

  const body = page.locator("body");
  await expect(body).toHaveCSS("background-color", "rgb(12, 12, 12)");
  const fontFamily = await body.evaluate(
    (el) => getComputedStyle(el).fontFamily,
  );
  expect(fontFamily.toLowerCase()).toContain("kanit");

  await expect(page.getByRole("main")).toBeVisible();
});

test("page never scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
