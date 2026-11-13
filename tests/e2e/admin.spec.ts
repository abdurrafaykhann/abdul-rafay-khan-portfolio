import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

test.describe("admin access", () => {
  test("every admin page sends signed-out visitors to the login page", async ({
    page,
  }) => {
    for (const path of [
      "/admin",
      "/admin/projects",
      "/admin/projects/new",
      "/admin/categories",
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  });

  test("draft preview requires the admin", async ({ page }) => {
    await page.goto("/admin/preview");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("the login form never reveals whether an email is allowed", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByRole("button", { name: /sign-in link/i }).click();
    await expect(page.getByRole("status")).toHaveText(
      /if that address is allowed in/i,
    );
  });

  test("admin pages are not indexed", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toMatch(/noindex/);
  });
});

/**
 * Full flow against the real database: sign in → create a project → publish
 * → it appears on the home page → delete it. Writes to the live database, so
 * it only runs when asked:  E2E_ADMIN=1 npx playwright test admin
 * Needs SUPABASE_SERVICE_ROLE_KEY (to mint a one-time sign-in link) and
 * ADMIN_EMAIL in .env.local.
 */
test.describe("admin create → publish → visible", () => {
  if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  test.skip(
    process.env.E2E_ADMIN !== "1" || !url || !serviceKey || !adminEmail,
    "set E2E_ADMIN=1 with SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAIL",
  );

  const slug = `e2e-test-${Date.now()}`;
  const title = `E2E Test Project ${Date.now()}`;

  test.afterAll(async () => {
    if (!url || !serviceKey) return;
    await createClient(url, serviceKey)
      .from("projects")
      .delete()
      .eq("slug", slug);
  });

  test("a published project shows on the site", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: adminEmail!,
    });
    expect(error).toBeNull();
    const tokenHash = data.properties!.hashed_token;
    await page.goto(
      `${baseURL}/admin/auth/callback?token_hash=${tokenHash}&type=magiclink`,
    );
    await expect(page).toHaveURL(/\/admin\/projects$/);

    await page.goto("/admin/projects/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Slug (web address)").fill(slug);
    await page
      .getByLabel("Short description")
      .fill("Created by the end-to-end test.");
    await page.getByLabel("Project type").selectOption({ label: "Personal" });
    await page.getByLabel("Primary category").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Save & publish" }).click();
    await expect(page.getByText(/changes are live/i)).toBeVisible();

    await page.goto("/");
    await expect(page.locator("#work")).toBeVisible();
    await expect(page.getByText(title).first()).toBeAttached();
  });
});
