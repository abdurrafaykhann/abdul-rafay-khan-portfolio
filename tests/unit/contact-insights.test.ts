import { describe, expect, it } from "vitest";
import { ContactSchema, clientIp, visitorHash } from "@/lib/contact";
import { summarizeEvents, type EventRow } from "@/lib/admin/insights";

describe("ContactSchema", () => {
  const ok = { name: "Ada", email: "ada@example.com", message: "Hello there" };

  it("accepts a normal message and defaults the honeypot", () => {
    const r = ContactSchema.safeParse(ok);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBe("");
  });

  it("rejects bad email, empty name and tiny or huge messages", () => {
    expect(ContactSchema.safeParse({ ...ok, email: "nope" }).success).toBe(
      false,
    );
    expect(ContactSchema.safeParse({ ...ok, name: "  " }).success).toBe(false);
    expect(ContactSchema.safeParse({ ...ok, message: "hi" }).success).toBe(
      false,
    );
    expect(
      ContactSchema.safeParse({ ...ok, message: "x".repeat(4001) }).success,
    ).toBe(false);
  });
});

describe("visitorHash", () => {
  it("is stable, anonymous and salt dependent", () => {
    const a = visitorHash("1.2.3.4", "UA", "salt");
    expect(a).toBe(visitorHash("1.2.3.4", "UA", "salt"));
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("1.2.3.4");
    expect(a).not.toBe(visitorHash("1.2.3.4", "UA", "other"));
    expect(a).not.toBe(visitorHash("1.2.3.5", "UA", "salt"));
  });

  it("takes the first forwarded address", () => {
    expect(clientIp("9.9.9.9, 10.0.0.1")).toBe("9.9.9.9");
    expect(clientIp(null)).toBeNull();
  });
});

describe("summarizeEvents", () => {
  const now = Date.parse("2026-06-30T12:00:00Z");
  const day = 86_400_000;
  const at = (d: number) => new Date(now - d * day).toISOString();
  const projects = [
    { id: "a", title: "Alpha" },
    { id: "b", title: "Beta" },
  ];
  const events: EventRow[] = [
    { type: "view", project_id: "a", target: null, created_at: at(1) },
    { type: "view", project_id: "a", target: null, created_at: at(45) },
    { type: "view", project_id: "b", target: null, created_at: at(2) },
    { type: "click", project_id: "a", target: "github", created_at: at(1) },
    { type: "click", project_id: "b", target: "github", created_at: at(3) },
    { type: "click", project_id: "b", target: null, created_at: at(3) },
  ];

  it("totals, windows and ranks", () => {
    const s = summarizeEvents(events, projects, now);
    expect(s.totalViews).toBe(3);
    expect(s.viewsLast30Days).toBe(2);
    expect(s.totalClicks).toBe(3);
    expect(s.perProject[0]).toMatchObject({
      id: "a",
      views: 2,
      views30: 1,
      clicks: 1,
    });
    expect(s.topLinks[0]).toEqual({ target: "github", clicks: 2 });
    expect(s.topLinks[1]).toEqual({ target: "other", clicks: 1 });
  });

  it("handles no events", () => {
    const s = summarizeEvents([], projects, now);
    expect(s.totalViews).toBe(0);
    expect(s.topLinks).toEqual([]);
  });
});
