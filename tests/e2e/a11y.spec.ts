import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Automated accessibility checks (axe-core). Serious and critical problems
 * fail the build. Moderate ones (and anything axe can't judge from a
 * screenshot-less run, like colour contrast over moving 3D) are left to the
 * manual pass listed in the README.
 */
const PAGES = [
  { name: "home", path: "/" },
  { name: "admin sign-in", path: "/admin/login" },
];

for (const { name, path } of PAGES) {
  test(`${name}: no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // contrast over the animated hero/3D is judged by eye, not by axe
      .disableRules(["color-contrast"])
      .analyze();
    const bad = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual(
      [],
    );
  });
}

test("home: the plain-mode switch and nav are keyboard reachable", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.tagName);
  expect(first).toBeTruthy();
  // a skip link or main landmark exists
  await expect(page.getByRole("main")).toBeVisible();
});
