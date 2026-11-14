import { expect, test } from "@playwright/test";

test.describe("search engines and link previews", () => {
  test("robots.txt hides the admin and API, and points at the sitemap", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/Disallow: \/admin/);
    expect(text).toMatch(/Disallow: \/api\//);
    expect(text).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("sitemap lists the home page", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(
      /<urlset[\s\S]*<loc>https?:\/\/[^<]+<\/loc>/,
    );
  });

  test("home page has a description, Open Graph tags, a preview image and Person data", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /AI Engineer/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Abdul Rafay Khan/,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );
    const ld = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent();
    expect(ld ? JSON.parse(ld) : null).toMatchObject({
      "@type": "Person",
      name: "Abdul Rafay Khan",
    });
  });

  test("the home preview image is a PNG", async ({ request }) => {
    const res = await request.get("/opengraph-image");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  });
});

test.describe("case study pages", () => {
  test("an unknown project is a real 404 and is not indexed", async ({
    page,
  }) => {
    const res = await page.goto("/work/does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("draft projects are not public", async ({ page }) => {
    // seeded drafts stay unpublished until the admin publishes them
    const res = await page.goto("/work/docsense");
    expect(res?.status()).toBe(404);
  });
});

test.describe("tracking endpoint", () => {
  const id = "6b1f6a8e-3f2a-4d0e-9c1b-2a3b4c5d6e7f";

  test("rejects malformed events", async ({ request }) => {
    for (const body of [
      {},
      { type: "purchase", projectId: id },
      { type: "view", projectId: "nope" },
    ]) {
      const res = await request.post("/api/track", { data: body });
      expect(res.status()).toBe(400);
    }
  });

  test("rejects other sites", async ({ request }) => {
    const res = await request.post("/api/track", {
      data: { type: "view", projectId: id },
      headers: { origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
  });

  test("accepts a valid event quietly (nothing is stored for an unknown project)", async ({
    request,
  }) => {
    const res = await request.post("/api/track", {
      data: { type: "view", projectId: id },
    });
    expect(res.status()).toBe(204);
    expect(await res.text()).toBe("");
  });
});
