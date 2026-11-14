// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, asAnon, asStranger, createDb, type Db } from "./harness";

let db: Db;

const vec = (...head: number[]) => {
  const v = new Array(768).fill(0);
  head.forEach((x, i) => (v[i] = x));
  return `[${v.join(",")}]`;
};

beforeAll(async () => {
  db = await createDb();
  // Supabase grants its roles use of the extensions schema by default
  await db.exec(
    `grant usage on schema extensions to anon, authenticated, service_role`,
  );
  await db.query(
    `insert into public.kb_chunks (source_type, source_id, source_url, title, content, hash, embedding) values
      ('project', 'a', '/work/a', 'A', 'about a', 'h1', $1),
      ('project', 'b', '/work/b', 'B', 'about b', 'h2', $2),
      ('about',   'about', null,   'Me', 'about me', 'h3', $3)`,
    [vec(1, 0), vec(0.8, 0.6), vec(0, 1)],
  );
}, 120_000);

afterAll(async () => {
  await db?.close();
});

const service = <T>(fn: (d: Db) => Promise<T>) =>
  as(db, { role: "service_role" }, fn);

describe("knowledge base access", () => {
  it("is invisible to the public and to non-admins", async () => {
    await expect(
      asAnon(db, (d) => d.query(`select * from public.kb_chunks`)),
    ).rejects.toThrow();
    const rows = await asStranger(db, (d) =>
      d.query(`select * from public.kb_chunks`),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("cannot be written by non-admins", async () => {
    await expect(
      asStranger(db, (d) =>
        d.query(
          `insert into public.kb_chunks (source_type, source_id, title, content, hash, embedding)
           values ('project','x','X','x','hx',$1)`,
          [vec(1)],
        ),
      ),
    ).rejects.toThrow();
  });

  it("match_chunks is not callable by anon", async () => {
    await expect(
      asAnon(db, (d) =>
        d.query(
          `select * from public.match_chunks($1::extensions.vector, 3, 0)`,
          [vec(1)],
        ),
      ),
    ).rejects.toThrow();
  });
});

describe("match_chunks", () => {
  it("orders by cosine similarity", async () => {
    const r = await service((d) =>
      d.query<{ source_id: string; similarity: number }>(
        `select source_id, similarity from public.match_chunks($1::extensions.vector, 3, 0)`,
        [vec(1, 0)],
      ),
    );
    expect(r.rows.map((x) => x.source_id)).toEqual(["a", "b", "about"]);
    expect(r.rows[0].similarity).toBeCloseTo(1);
    expect(r.rows[1].similarity).toBeCloseTo(0.8);
  });

  it("drops chunks below the threshold and respects the limit", async () => {
    const above = await service((d) =>
      d.query<{ source_id: string }>(
        `select source_id from public.match_chunks($1::extensions.vector, 3, 0.7)`,
        [vec(1, 0)],
      ),
    );
    expect(above.rows.map((x) => x.source_id)).toEqual(["a", "b"]);

    const one = await service((d) =>
      d.query(
        `select * from public.match_chunks($1::extensions.vector, 1, 0)`,
        [vec(1, 0)],
      ),
    );
    expect(one.rows).toHaveLength(1);
  });

  it("refuses a second copy of the same chunk", async () => {
    await expect(
      db.query(
        `insert into public.kb_chunks (source_type, source_id, title, content, hash, embedding)
         values ('project','a','A','dup','h1',$1)`,
        [vec(1)],
      ),
    ).rejects.toThrow();
  });
});
