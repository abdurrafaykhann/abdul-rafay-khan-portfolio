import { describe, expect, it } from "vitest";
import {
  REDACTED,
  sanitizeWorkflow,
  summarizeRemovals,
} from "@/lib/n8n/sanitize";

// Key-shaped fixtures are assembled at runtime so this file never contains a
// literal that a secret scanner could mistake for a real key.
const GROQ_LIKE = ["gsk", "_abcdefghijklmnopqrstuvwxyz012345"].join("");
const GOOGLE_LIKE = ["AIza", "SyA1234567890abcdefghijklmnopqrstuv"].join("");

/** A realistic workflow full of things that must never be published. */
const dirty = {
  name: "Order bot",
  nodes: [
    {
      id: "n1",
      name: "WhatsApp Trigger",
      type: "n8n-nodes-base.webhook",
      webhookId: "5f0c1b2a-aaaa-bbbb-cccc-123456789abc",
      parameters: { path: "secret-order-hook-8842", httpMethod: "POST" },
      credentials: { whatsAppApi: { id: "77", name: "Sweet Crumbs WhatsApp" } },
    },
    {
      id: "n2",
      name: "Call model",
      type: "n8n-nodes-base.httpRequest",
      parameters: {
        url: "https://api.groq.com/openai/v1/chat/completions",
        headerParameters: {
          parameters: [
            {
              name: "Authorization",
              value: `Bearer ${GROQ_LIKE}`,
            },
          ],
        },
        apiKey: GOOGLE_LIKE,
        sendBody: true,
        bodyParameters: { prompt: "={{ $json.message }}" },
      },
    },
    {
      id: "n3",
      name: "Notify",
      type: "n8n-nodes-base.slack",
      parameters: {
        webhookUrl: "https://hooks.slack.com/services/T000/B000/XXXXXXXX",
        text: "New order",
      },
    },
    {
      id: "n4",
      name: "DB",
      type: "n8n-nodes-base.postgres",
      parameters: {
        connection: "postgres://admin:hunter2@db.example.com:5432/shop",
        query: "select 1",
      },
    },
  ],
  connections: {
    "WhatsApp Trigger": {
      main: [[{ node: "Call model", type: "main", index: 0 }]],
    },
  },
  pinData: {
    "WhatsApp Trigger": [
      { json: { from: "+923001234567", body: "2 cakes please" } },
    ],
  },
  staticData: { global: { lastId: 99 } },
  meta: { instanceId: "abc123def456", templateCredsSetupCompleted: true },
  settings: { executionOrder: "v1" },
};

const clean = () => {
  const r = sanitizeWorkflow(JSON.stringify(dirty));
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe("sanitizeWorkflow", () => {
  it("removes every secret and personal detail from the output", () => {
    const { json } = clean();
    for (const secret of [
      GROQ_LIKE,
      GOOGLE_LIKE,
      "hooks.slack.com/services",
      "hunter2",
      "secret-order-hook-8842",
      "5f0c1b2a-aaaa-bbbb-cccc-123456789abc",
      "Sweet Crumbs WhatsApp",
      "+923001234567",
      "2 cakes please",
      "abc123def456",
    ]) {
      expect(json).not.toContain(secret);
    }
  });

  it("keeps the workflow's structure, logic and harmless values", () => {
    const { workflow } = clean() as { workflow: typeof dirty };
    expect(workflow.name).toBe("Order bot");
    expect(workflow.nodes).toHaveLength(4);
    expect(workflow.nodes.map((n) => n.name)).toEqual([
      "WhatsApp Trigger",
      "Call model",
      "Notify",
      "DB",
    ]);
    expect(workflow.connections).toEqual(dirty.connections);
    expect(workflow.nodes[1].parameters.url).toBe(
      "https://api.groq.com/openai/v1/chat/completions",
    );
    expect(workflow.nodes[1].parameters.bodyParameters?.prompt).toBe(
      "={{ $json.message }}",
    );
    expect(workflow.nodes[3].parameters.query).toBe("select 1");
    expect(workflow.settings).toEqual({ executionOrder: "v1" });
  });

  it("replaces secrets with a marker and drops credential / pinned / static blocks", () => {
    const { workflow } = clean() as {
      workflow: Record<string, unknown> & { nodes: Record<string, unknown>[] };
    };
    expect(workflow.nodes[0].credentials).toBeUndefined();
    expect(workflow.nodes[0].webhookId).toBeUndefined();
    expect((workflow.nodes[0].parameters as { path: string }).path).toBe(
      REDACTED,
    );
    expect(workflow.pinData).toBeUndefined();
    expect(workflow.staticData).toBeUndefined();
    expect(
      (workflow.meta as Record<string, unknown>).instanceId,
    ).toBeUndefined();
    expect((workflow.nodes[1].parameters as { apiKey: string }).apiKey).toBe(
      REDACTED,
    );
  });

  it("reports every removal so the admin can review the diff (without full secrets)", () => {
    const { removed } = clean();
    const reasons = removed.map((r) => r.reason).join("|");
    expect(reasons).toMatch(/credentials block/);
    expect(reasons).toMatch(/pinned test data/);
    expect(reasons).toMatch(/webhook/i);
    expect(reasons).toMatch(/connection string/);
    expect(reasons).toMatch(/webhookUrl|Slack webhook/);
    expect(removed.every((r) => r.path && r.preview.length <= 40)).toBe(true);
    for (const r of removed) expect(r.preview).not.toContain("hunter2");
    expect(summarizeRemovals(removed)).toMatch(/×/);
  });

  it("is idempotent: cleaning clean output removes nothing more", () => {
    const first = clean();
    const second = sanitizeWorkflow(first.json);
    expect(second.ok && second.removed).toEqual([]);
    expect(second.ok && second.json).toBe(first.json);
  });

  it("leaves a harmless workflow untouched and says nothing was found", () => {
    const safe = {
      nodes: [
        {
          id: "a",
          name: "Set",
          type: "n8n-nodes-base.set",
          parameters: { value: "hello world" },
        },
      ],
      connections: {},
    };
    const r = sanitizeWorkflow(JSON.stringify(safe));
    expect(r.ok && r.removed).toEqual([]);
    expect(r.ok && r.workflow).toEqual(safe);
    expect(summarizeRemovals([])).toBe("Nothing sensitive found.");
  });

  it("does not mistake ordinary long text or expressions for secrets", () => {
    const r = sanitizeWorkflow(
      JSON.stringify({
        nodes: [
          {
            name: "Msg",
            type: "n8n-nodes-base.set",
            parameters: {
              text: "Thanks for ordering with us, your cake will be ready tomorrow afternoon!",
              token: "={{ $json.token }}",
              image:
                "https://example.com/images/cake-photo-large-final-version-2026.png",
            },
          },
        ],
        connections: {},
      }),
    );
    expect(r.ok && r.removed).toEqual([]);
  });

  it("rejects bad input", () => {
    expect(sanitizeWorkflow("not json")).toEqual({
      ok: false,
      error: "That file is not valid JSON.",
    });
    expect(sanitizeWorkflow("[]").ok).toBe(false);
    expect(sanitizeWorkflow('{"hello":1}').ok).toBe(false);
    expect(sanitizeWorkflow("x".repeat(2 * 1024 * 1024 + 1)).ok).toBe(false);
  });
});
