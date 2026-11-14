import { expect, test } from "@playwright/test";

test("responses carry the security headers", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  const csp = h["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'none'");
  // the public site never needs eval (the dev server itself does)
  if (process.env.CI || process.env.E2E_BASE_URL) {
    expect(csp).not.toContain("unsafe-eval");
  }
  expect(h["x-powered-by"]).toBeUndefined();
});

test("the home page runs under the CSP without violations", async ({
  page,
}) => {
  const problems: string[] = [];
  page.on("console", (m) => {
    const t = m.text();
    if (/content security policy|refused to (load|execute|connect)/i.test(t)) {
      // the Vercel preview toolbar is not part of the site
      if (!/vercel\.live|vercel\.com/i.test(t)) problems.push(t);
    }
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // let the hero and lazy chunks load
  expect(problems).toEqual([]);
});

test("the AI endpoints refuse other origins and bad input", async ({
  request,
}) => {
  const cross = await request.post("/api/ask", {
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    data: { question: "hi" },
  });
  expect(cross.status()).toBe(403);
  const cross2 = await request.post("/api/match", {
    headers: {
      origin: "https://evil.example",
      "content-type": "application/json",
    },
    data: { jd: "x" },
  });
  expect(cross2.status()).toBe(403);
  // no keys / bad input → a clean error, never a crash
  const bad = await request.post("/api/ask", {
    headers: { "content-type": "application/json" },
    data: "not json",
  });
  expect([400, 503]).toContain(bad.status());
});

test("a match page for an unknown id is a real 404", async ({ request }) => {
  const res = await request.get("/match/00000000-0000-4000-8000-000000000000");
  expect(res.status()).toBe(404);
  const res2 = await request.get("/match/not-a-uuid");
  expect(res2.status()).toBe(404);
});
