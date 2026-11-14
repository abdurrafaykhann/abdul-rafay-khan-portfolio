// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAdmin, asAnon, asStranger, createDb, type Db } from "./harness";

let db: Db;

beforeAll(async () => {
  db = await createDb();
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const service = <T>(fn: (d: Db) => Promise<T>) =>
  as(db, { role: "service_role" }, fn);
const hit = (d: Db, kind: string, visitor: string, max = 3, secs = 600) =>
  d
    .query<{ r: boolean }>(`select public.hit_rate_limit($1,$2,$3,$4) as r`, [
      kind,
      visitor,
      max,
      secs,
    ])
    .then((x) => x.rows[0].r);

describe("hit_rate_limit", () => {
  it("allows up to the limit, then refuses", async () => {
    const results = await service(async (d) => [
      await hit(d, "ask", "v1"),
      await hit(d, "ask", "v1"),
      await hit(d, "ask", "v1"),
      await hit(d, "ask", "v1"),
    ]);
    expect(results).toEqual([true, true, true, false]);
  });

  it("counts visitors and kinds separately", async () => {
    expect(await service((d) => hit(d, "ask", "v2"))).toBe(true);
    expect(await service((d) => hit(d, "match", "v1"))).toBe(true);
  });

  it("forgets hits outside the window", async () => {
    await db.query(
      `insert into private.rate_hits (kind, visitor, at)
       select 'ask', 'old', now() - interval '2 hours' from generate_series(1, 5)`,
    );
    expect(await service((d) => hit(d, "ask", "old", 3, 600))).toBe(true);
  });

  it("cannot be called by the public or by signed-in users", async () => {
    await expect(asAnon(db, (d) => hit(d, "ask", "x"))).rejects.toThrow();
    await expect(asStranger(db, (d) => hit(d, "ask", "x"))).rejects.toThrow();
    await expect(asAdmin(db, (d) => hit(d, "ask", "x"))).rejects.toThrow();
  });
});

describe("ask_logs and matches", () => {
  it("are written by the server and read only by the admin", async () => {
    await service(async (d) => {
      await d.query(
        `insert into public.ask_logs (question, answered, sources, model) values ('what is sentinel?', true, 2, 'groq')`,
      );
      await d.query(
        `insert into public.matches (job_title, company, result) values ('ML Engineer', 'Acme', '{"summary":"x"}')`,
      );
    });
    const adminLogs = await asAdmin(db, (d) =>
      d.query(`select * from public.ask_logs`),
    );
    expect(adminLogs.rows).toHaveLength(1);
    const adminMatches = await asAdmin(db, (d) =>
      d.query(`select * from public.matches`),
    );
    expect(adminMatches.rows).toHaveLength(1);

    expect(
      (await asStranger(db, (d) => d.query(`select * from public.ask_logs`)))
        .rows,
    ).toHaveLength(0);
    expect(
      (await asStranger(db, (d) => d.query(`select * from public.matches`)))
        .rows,
    ).toHaveLength(0);
    await expect(
      asAnon(db, (d) => d.query(`select * from public.ask_logs`)),
    ).rejects.toThrow();
    await expect(
      asAnon(db, (d) => d.query(`select * from public.matches`)),
    ).rejects.toThrow();
  });

  it("cannot be written by visitors or non-admins", async () => {
    await expect(
      asAnon(db, (d) =>
        d.query(`insert into public.ask_logs (question) values ('x')`),
      ),
    ).rejects.toThrow();
    await expect(
      asStranger(db, (d) =>
        d.query(`insert into public.matches (result) values ('{}')`),
      ),
    ).rejects.toThrow();
  });
});
