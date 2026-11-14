// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, createDb, type Db } from "./harness";

let db: Db;

beforeAll(async () => {
  db = await createDb();
  await db.exec(`delete from public.messages`);
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const submit = (
  d: Db,
  visitor: string,
  over: Partial<Record<"name" | "email" | "body", string>> = {},
) =>
  d
    .query<{ r: string }>(`select public.submit_message($1, $2, $3, $4) as r`, [
      over.name ?? "Sara",
      over.email ?? "sara@example.com",
      over.body ?? "Hello, I would like to talk about a project.",
      visitor,
    ])
    .then((x) => x.rows[0].r);

describe("contact form (submit_message)", () => {
  it("stores a valid message for an anonymous visitor", async () => {
    expect(await asAnon(db, (d) => submit(d, "v1"))).toBe("ok");
    const n = await db.query<{ n: number }>(
      `select count(*)::int as n from public.messages`,
    );
    expect(n.rows[0].n).toBe(1);
    const row = await db.query<{ status: string; visitor_hash: string }>(
      `select status, visitor_hash from public.messages`,
    );
    expect(row.rows[0]).toEqual({ status: "new", visitor_hash: "v1" });
  });

  it("rejects empty, oversized and malformed input without storing anything", async () => {
    const before = await db.query<{ n: number }>(
      `select count(*)::int as n from public.messages`,
    );
    await asAnon(db, async (d) => {
      expect(await submit(d, "v2", { name: "  " })).toBe("invalid");
      expect(await submit(d, "v2", { email: "not-an-email" })).toBe("invalid");
      expect(await submit(d, "v2", { body: "hi" })).toBe("invalid");
      expect(await submit(d, "v2", { body: "x".repeat(4001) })).toBe("invalid");
    });
    const after = await db.query<{ n: number }>(
      `select count(*)::int as n from public.messages`,
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it("allows 3 messages an hour per visitor, then rate-limits", async () => {
    await asAnon(db, async (d) => {
      expect(await submit(d, "v3")).toBe("ok");
      expect(await submit(d, "v3")).toBe("ok");
      expect(await submit(d, "v3")).toBe("ok");
      expect(await submit(d, "v3")).toBe("rate_limited");
      // another visitor is unaffected
      expect(await submit(d, "v4")).toBe("ok");
    });
  });

  it("has a global ceiling so a botnet cannot flood the inbox", async () => {
    await db.exec(`delete from public.messages`);
    await asAnon(db, async (d) => {
      for (let i = 0; i < 60; i++)
        expect(await submit(d, `bot-${i}`)).toBe("ok");
      expect(await submit(d, "bot-late")).toBe("rate_limited");
    });
  });

  it("visitors can never read, change or delete messages", async () => {
    await asAnon(db, async (d) => {
      await expect(d.query(`select * from public.messages`)).rejects.toThrow(
        /permission denied/i,
      );
      await expect(
        d.exec(`update public.messages set status = 'read'`),
      ).rejects.toThrow(/permission denied/i);
      await expect(d.exec(`delete from public.messages`)).rejects.toThrow(
        /permission denied/i,
      );
      await expect(
        d.exec(
          `insert into public.messages (name, email, body) values ('a','a@b.c','spam spam')`,
        ),
      ).rejects.toThrow(/permission denied/i);
    });
  });

  it("the admin can read and archive messages", async () => {
    await asAdmin(db, async (d) => {
      const n = await d.query<{ n: number }>(
        `select count(*)::int as n from public.messages`,
      );
      expect(n.rows[0].n).toBe(60);
      await d.exec(
        `update public.messages set status = 'archived' where visitor_hash = 'bot-0'`,
      );
    });
    const a = await db.query<{ n: number }>(
      `select count(*)::int as n from public.messages where status = 'archived'`,
    );
    expect(a.rows[0].n).toBe(1);
  });
});

describe("reorder education", () => {
  it("orders the education entries", async () => {
    const before = await db.query<{ id: string }>(
      `select id from public.education order by sort`,
    );
    const reversed = before.rows.map((r) => r.id).reverse();
    await asAdmin(db, (d) =>
      d.query(`select public.reorder('education', $1::uuid[])`, [reversed]),
    );
    const after = await db.query<{ id: string }>(
      `select id from public.education order by sort`,
    );
    expect(after.rows.map((r) => r.id)).toEqual(reversed);
  });
});
