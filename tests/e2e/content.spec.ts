import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Home page with no database configured (the state of CI and of a fresh
 * clone): only the hero shows — no empty sections, no dead nav links.
 * Skipped when a local .env.local points the dev server at a real database.
 */
// The dev server reads .env.local; check for a database URL there too
// (only whether the variable has a value; nothing is printed).
const dbConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (fs.existsSync(".env.local") &&
    /^NEXT_PUBLIC_SUPABASE_URL=\S+/m.test(
      fs.readFileSync(".env.local", "utf8"),
    ));

test.describe("home without content", () => {
  test.skip(dbConfigured, "a database is configured");

  test("hides every content section and its nav link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    for (const id of ["about", "what-i-do", "work", "education"]) {
      await expect(page.locator(`#${id}`)).toHaveCount(0);
    }
    await expect(page.locator("[data-marquee-row]")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Main" });
    // just the name/logo — no link points at a section that isn't there
    await expect(nav.getByRole("link")).toHaveCount(1);
    await expect(page.getByText(/placeholder|coming soon|lorem/i)).toHaveCount(
      0,
    );
  });
});

test.describe("protected routes", () => {
  test("draft preview rejects a wrong or missing secret", async ({
    request,
  }) => {
    expect((await request.get("/api/draft")).status()).toBe(401);
    expect((await request.get("/api/draft?secret=nope")).status()).toBe(401);
  });

  test("keep-alive endpoint rejects callers without the cron secret", async ({
    request,
  }) => {
    expect((await request.get("/api/keepalive")).status()).toBe(401);
    expect(
      (
        await request.get("/api/keepalive", {
          headers: { authorization: "Bearer wrong" },
        })
      ).status(),
    ).toBe(401);
  });
});

/** With the real database: Education & Skills from the CV, no employers. */
test.describe("home with the database", () => {
  test.skip(!dbConfigured, "no database configured");

  test("shows Education & Skills and never an employer name", async ({
    page,
  }) => {
    await page.goto("/");
    const education = page.locator("#education");
    await expect(education).toBeVisible();
    await expect(education.locator("ol > li")).toHaveCount(3);
    await expect(
      education.locator("ol").getByText("BSc Computer Science"),
    ).toBeVisible();
    await expect(page.locator("#skills")).toBeVisible();
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/\b(Bank|Ltd|Limited|Company|Global|agency)\b/i);
  });
});

/** Content-driven sections, exercised on the dev-only playground fixtures. */
test.describe("what I do + work (playground)", () => {
  test.skip(!!process.env.CI, "dev-only playground");

  const visibleCards = (page: Page) =>
    page.locator("[data-project-card]:not([hidden])");

  test("clicking a What I do item jumps to Work filtered to that category", async ({
    page,
  }) => {
    await page.goto("/dev");
    await page.locator('[data-category-link="fixture-1"]').click();
    await expect(page).toHaveURL(/#work$/);
    await expect(
      page.getByRole("button", { name: "Fixture Agents" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(visibleCards(page)).toHaveCount(5);
  });

  test("filter bar and Load more", async ({ page }) => {
    await page.goto("/dev");
    await page.locator("[data-all-work]").scrollIntoViewIfNeeded();
    await expect(visibleCards(page)).toHaveCount(12);

    await page.getByRole("button", { name: "Load more" }).click();
    await expect(visibleCards(page)).toHaveCount(15);

    await page.getByRole("button", { name: "Fixture Websites" }).click();
    await expect(visibleCards(page)).toHaveCount(5);
    // cards settle fully visible after the Flip animation
    await expect(visibleCards(page).first()).toHaveCSS("opacity", "1");

    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(visibleCards(page)).toHaveCount(12);
  });

  test("key project cards stack and scale down as later cards cover them", async ({
    page,
  }) => {
    await page.goto("/dev");
    const cards = page.locator("[data-stack-card]");
    await expect(cards).toHaveCount(3);

    const scaleOf = (i: number) =>
      cards.nth(i).evaluate((el) => {
        const m = new DOMMatrix(getComputedStyle(el).transform);
        return m.a;
      });

    // scroll to the end of the stack
    await page.locator("[data-all-work]").evaluate((el) => {
      window.scrollTo(
        0,
        el.getBoundingClientRect().top + window.scrollY - window.innerHeight,
      );
    });
    await expect.poll(() => scaleOf(0)).toBeCloseTo(0.94, 2);
    expect(await scaleOf(1)).toBeCloseTo(0.97, 2);
    expect(await scaleOf(2)).toBeCloseTo(1, 2);

    // the stack never covers what follows it
    const filter = page.getByRole("button", { name: "Fixture Agents" });
    await filter.scrollIntoViewIfNeeded();
    await filter.click({ timeout: 3000 });
    await expect(filter).toHaveAttribute("aria-pressed", "true");
  });

  test("plain mode: cards still stack but do not scale", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("plain-mode", "1"));
    await page.goto("/dev");
    await page.locator("[data-all-work]").evaluate((el) => {
      window.scrollTo(
        0,
        el.getBoundingClientRect().top + window.scrollY - window.innerHeight,
      );
    });
    await page.waitForTimeout(400);
    const transform = await page
      .locator("[data-stack-card]")
      .first()
      .evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe("none");
  });
});
