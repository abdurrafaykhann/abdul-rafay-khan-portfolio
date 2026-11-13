// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAdmin, asAnon, asStranger, createDb, type Db } from "./harness";

let db: Db;

const count = async (d: Db, sql: string, params: unknown[] = []) =>
  Number((await d.query<{ n: number }>(sql, params)).rows[0].n);

const idOf = async (table: string, slug: string) =>
  (
    await db.query<{ id: string }>(
      `select id from public.${table} where slug = $1`,
      [slug],
    )
  ).rows[0].id;

beforeAll(async () => {
  db = await createDb();
}, 120_000);

afterAll(async () => {
  await db?.close();
});

describe("seed", () => {
  it("creates the default types and categories", async () => {
    const types = await db.query<{ name: string }>(
      `select name from public.project_types order by sort`,
    );
    expect(types.rows.map((r) => r.name)).toEqual([
      "Client",
      "Personal",
      "Final-year project",
      "SaaS product",
      "GaaS product",
    ]);
    const categories = await db.query<{ name: string }>(
      `select name from public.categories order by sort`,
    );
    expect(categories.rows.map((r) => r.name)).toEqual([
      "AI Automations",
      "Agentic AI",
      "Websites & Client Work",
      "Computer Vision",
      "Machine Learning & Data Science",
      "3D & WebGL",
    ]);
  });

  it("seeds exactly three projects, all unpublished drafts", async () => {
    const projects = await db.query<{ slug: string; published: boolean }>(
      `select slug, published from public.projects order by sort`,
    );
    expect(projects.rows).toEqual([
      { slug: "sentinel", published: false },
      { slug: "sweet-crumbs-whatsapp-agent", published: false },
      { slug: "docsense", published: false },
    ]);
  });

  it("fills Sentinel's trained-vs-integrated table as specified", async () => {
    const rows = await db.query<{
      component: string;
      kind: string;
      evaluation: string;
    }>(
      `select t.component, t.kind, t.evaluation
       from public.trained_vs_integrated t
       join public.projects p on p.id = t.project_id
       where p.slug = 'sentinel' order by t.sort`,
    );
    expect(rows.rows).toEqual([
      {
        component: "Violence classifier",
        kind: "trained",
        evaluation: "79% recall / 81% precision on 400 held-out clips",
      },
      {
        component: "Face identification",
        kind: "integrated",
        evaluation: "97.7% top-1 on a 54-person held-out test",
      },
      { component: "Weapon detector", kind: "integrated", evaluation: "" },
    ]);
  });

  it("is safe to run twice", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    await db.exec(
      fs.readFileSync(
        path.resolve(__dirname, "../../supabase/seed.sql"),
        "utf8",
      ),
    );
    expect(await count(db, `select count(*) n from public.projects`)).toBe(3);
    expect(await count(db, `select count(*) n from public.categories`)).toBe(6);
    expect(
      await count(db, `select count(*) n from public.trained_vs_integrated`),
    ).toBe(3);
  });
});

describe("public (anon) reads", () => {
  it("sees categories and types, but no draft projects or their child rows", async () => {
    await asAnon(db, async (d) => {
      expect(await count(d, `select count(*) n from public.categories`)).toBe(
        6,
      );
      expect(
        await count(d, `select count(*) n from public.project_types`),
      ).toBe(5);
      expect(await count(d, `select count(*) n from public.projects`)).toBe(0);
      expect(
        await count(d, `select count(*) n from public.project_metrics`),
      ).toBe(0);
      expect(
        await count(d, `select count(*) n from public.trained_vs_integrated`),
      ).toBe(0);
      expect(
        await count(d, `select count(*) n from public.project_categories`),
      ).toBe(0);
    });
  });

  it("sees a project and its child rows once it is published", async () => {
    await db.exec(
      `update public.projects set published = true where slug = 'sentinel'`,
    );
    try {
      await asAnon(db, async (d) => {
        const rows = await d.query<{ slug: string }>(
          `select slug from public.projects`,
        );
        expect(rows.rows.map((r) => r.slug)).toEqual(["sentinel"]);
        expect(
          await count(d, `select count(*) n from public.trained_vs_integrated`),
        ).toBe(3);
        expect(
          await count(d, `select count(*) n from public.project_metrics`),
        ).toBe(3);
      });
    } finally {
      await db.exec(
        `update public.projects set published = false where slug = 'sentinel'`,
      );
    }
  });

  it("only sees traction metrics marked 'show publicly'", async () => {
    const id = await idOf("projects", "sentinel");
    await db.query(
      `insert into public.traction_metrics (project_id, label, value, show_public)
       values ($1, 'Users', '120', true), ($1, 'MRR', '$900', false)`,
      [id],
    );
    await db.exec(
      `update public.projects set published = true where slug = 'sentinel'`,
    );
    try {
      await asAnon(db, async (d) => {
        const rows = await d.query<{ label: string }>(
          `select label from public.traction_metrics`,
        );
        expect(rows.rows.map((r) => r.label)).toEqual(["Users"]);
      });
    } finally {
      await db.exec(
        `update public.projects set published = false where slug = 'sentinel';
         delete from public.traction_metrics;`,
      );
    }
  });

  it("can never read the raw client name; the display name is null when hidden", async () => {
    await db.exec(
      `update public.projects
         set client_name = 'Secret Client Ltd', hide_client_name = true, published = true
       where slug = 'sentinel'`,
    );
    try {
      await asAnon(db, async (d) => {
        await expect(
          d.query(`select client_name from public.projects`),
        ).rejects.toThrow(/permission denied/i);
        await expect(d.query(`select * from public.projects`)).rejects.toThrow(
          /permission denied/i,
        );
        const hidden = await d.query<{ client_display_name: string | null }>(
          `select client_display_name from public.projects where slug = 'sentinel'`,
        );
        expect(hidden.rows[0].client_display_name).toBeNull();
      });

      await db.exec(
        `update public.projects set hide_client_name = false where slug = 'sentinel'`,
      );
      await asAnon(db, async (d) => {
        const shown = await d.query<{ client_display_name: string | null }>(
          `select client_display_name from public.projects where slug = 'sentinel'`,
        );
        expect(shown.rows[0].client_display_name).toBe("Secret Client Ltd");
      });
    } finally {
      await db.exec(
        `update public.projects
           set client_name = null, hide_client_name = false, published = false
         where slug = 'sentinel'`,
      );
    }
  });

  it("has no access to server-only tables", async () => {
    await asAnon(db, async (d) => {
      for (const table of [
        "messages",
        "events",
        "chat_logs",
        "match_results",
        "rate_limits",
        "kb_chunks",
      ]) {
        await expect(d.query(`select * from public.${table}`)).rejects.toThrow(
          /permission denied/i,
        );
      }
      await expect(d.query(`select * from private.config`)).rejects.toThrow(
        /permission denied/i,
      );
    });
  });
});

describe("public (anon) writes are rejected", () => {
  it.each([
    [
      "insert a project",
      `insert into public.projects (slug, title) values ('x', 'X')`,
    ],
    ["publish a draft", `update public.projects set published = true`],
    ["delete projects", `delete from public.projects`],
    [
      "insert a category",
      `insert into public.categories (slug, name) values ('x', 'X')`,
    ],
    ["rename a category", `update public.categories set name = 'Hacked'`],
    [
      "change site content",
      `update public.site_content set value = '"hacked"'::jsonb`,
    ],
    [
      "insert a message directly",
      `insert into public.messages (name, email, body) values ('a', 'a@b.c', 'hi')`,
    ],
    [
      "insert a metric",
      `insert into public.project_metrics (project_id, label, value)
       select id, 'Fake', '100%' from public.projects limit 1`,
    ],
  ])("cannot %s", async (_name, sql) => {
    await asAnon(db, async (d) => {
      await expect(d.exec(sql)).rejects.toThrow(/permission denied/i);
    });
  });
});

describe("signed-in users who are not the admin are rejected", () => {
  it("cannot read drafts or server-only data", async () => {
    await asStranger(db, async (d) => {
      expect(await count(d, `select count(*) n from public.projects`)).toBe(0);
      expect(await count(d, `select count(*) n from public.categories`)).toBe(
        0,
      );
      expect(await count(d, `select count(*) n from public.messages`)).toBe(0);
    });
  });

  it("cannot insert", async () => {
    await asStranger(db, async (d) => {
      await expect(
        d.exec(`insert into public.projects (slug, title) values ('x', 'X')`),
      ).rejects.toThrow(/row-level security/i);
      await expect(
        d.exec(`insert into public.categories (slug, name) values ('x', 'X')`),
      ).rejects.toThrow(/row-level security/i);
    });
  });

  it("updates and deletes affect nothing", async () => {
    await asStranger(db, async (d) => {
      const updated = await d.query(
        `update public.projects set title = 'Hacked' returning id`,
      );
      expect(updated.rows).toHaveLength(0);
      const deleted = await d.query(
        `delete from public.categories returning id`,
      );
      expect(deleted.rows).toHaveLength(0);
    });
    expect(
      await count(
        db,
        `select count(*) n from public.projects where title = 'Hacked'`,
      ),
    ).toBe(0);
    expect(await count(db, `select count(*) n from public.categories`)).toBe(6);
  });
});

describe("the admin", () => {
  it("can read drafts and write content", async () => {
    await asAdmin(db, async (d) => {
      expect(await count(d, `select count(*) n from public.projects`)).toBe(3);
      await d.exec(
        `insert into public.categories (slug, name, sort) values ('temp', 'Temp', 99)`,
      );
      await d.exec(
        `update public.categories set name = 'Temp 2' where slug = 'temp'`,
      );
      expect(
        await count(
          d,
          `select count(*) n from public.categories where name = 'Temp 2'`,
        ),
      ).toBe(1);
      await d.exec(`delete from public.categories where slug = 'temp'`);
    });
    expect(await count(db, `select count(*) n from public.categories`)).toBe(6);
  });

  it("is matched case-insensitively", async () => {
    const { as } = await import("./harness");
    await as(
      db,
      { role: "authenticated", email: "ADMIN@Example.Test" },
      async (d) => {
        expect(await count(d, `select count(*) n from public.projects`)).toBe(
          3,
        );
      },
    );
  });
});

describe("publish rules", () => {
  it("a client project cannot be published until the client has approved", async () => {
    const client = await idOf("project_types", "client");
    const category = await idOf("categories", "websites-client-work");
    await db.query(
      `insert into public.projects (slug, title, type_id, primary_category_id)
       values ('client-site', 'Client Site', $1, $2)`,
      [client, category],
    );
    try {
      await expect(
        db.exec(
          `update public.projects set published = true where slug = 'client-site'`,
        ),
      ).rejects.toThrow(/client approval is required/i);

      // the admin is bound by the rule too
      await asAdmin(db, async (d) => {
        await expect(
          d.exec(
            `update public.projects set published = true where slug = 'client-site'`,
          ),
        ).rejects.toThrow(/client approval is required/i);
      });

      await db.exec(
        `update public.projects set client_approved = true, published = true
         where slug = 'client-site'`,
      );
      expect(
        await count(
          db,
          `select count(*) n from public.projects where slug = 'client-site' and published`,
        ),
      ).toBe(1);

      // withdrawing approval while published is blocked as well
      await expect(
        db.exec(
          `update public.projects set client_approved = false where slug = 'client-site'`,
        ),
      ).rejects.toThrow(/client approval is required/i);
    } finally {
      await db.exec(`delete from public.projects where slug = 'client-site'`);
    }
  });

  it("non-client types publish without approval", async () => {
    await db.exec(
      `update public.projects set published = true where slug = 'sentinel'`,
    );
    await db.exec(
      `update public.projects set published = false where slug = 'sentinel'`,
    );
  });

  it("a project without a type or primary category cannot be published", async () => {
    await expect(
      db.exec(
        `update public.projects set published = true where slug = 'docsense'`,
      ),
    ).rejects.toThrow(/needs a type and a primary category/i);
  });

  it("rejects unknown statuses (no 'coming soon')", async () => {
    await expect(
      db.exec(
        `update public.projects set status = 'coming_soon' where slug = 'docsense'`,
      ),
    ).rejects.toThrow(/check constraint/i);
  });
});

describe("knowledge base", () => {
  it("stores 768-dimension embeddings and finds the nearest chunk", async () => {
    const vec = (hot: number) =>
      `[${Array.from({ length: 768 }, (_, i) => (i === hot ? 1 : 0)).join(",")}]`;
    await db.query(
      `insert into public.kb_chunks (source_type, source_id, content, hash, embedding)
       values ('about', 'a', 'first', 'h1', $1), ('about', 'b', 'second', 'h2', $2)`,
      [vec(0), vec(1)],
    );
    const res = await db.query<{ content: string; similarity: number }>(
      `select content, similarity from public.match_chunks($1::extensions.vector, 1, 0.5)`,
      [vec(1)],
    );
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].content).toBe("second");
    expect(res.rows[0].similarity).toBeCloseTo(1);

    await expect(
      db.query(
        `insert into public.kb_chunks (source_type, source_id, content, hash, embedding)
         values ('about', 'c', 'bad', 'h3', '[1,2,3]')`,
      ),
    ).rejects.toThrow(/dimensions/i);
    await db.exec(`delete from public.kb_chunks`);
  });
});
