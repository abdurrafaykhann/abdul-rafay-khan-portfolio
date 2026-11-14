/**
 * Cleans an exported n8n workflow before it is published.
 *
 * Removes: credential blocks and IDs, webhook IDs / paths / URLs, anything
 * that looks like a secret (by key name or by value), pinned test data,
 * static data and instance metadata. Nothing is changed silently: every
 * removal is returned so the admin can review it before saving.
 */

export type Removal = {
  /** where it was, e.g. nodes[2].credentials */
  path: string;
  /** why it was removed or replaced */
  reason: string;
  /** what it was, shortened and with the middle hidden (never the full secret) */
  preview: string;
};

export type SanitizeResult =
  | { ok: true; workflow: unknown; removed: Removal[]; json: string }
  | { ok: false; error: string };

export const REDACTED = "[REMOVED]";
export const MAX_WORKFLOW_BYTES = 2 * 1024 * 1024;

/** Keys whose value is dropped entirely. */
const DROP_KEYS: Record<string, string> = {
  credentials: "credentials block",
  pindata: "pinned test data (may contain real customer data)",
  staticdata: "workflow static data",
  webhookid: "webhook ID",
  instanceid: "instance ID",
  versionid: "version ID",
  id: "", // handled specially (only inside nodes/credential refs)
};

const SECRET_KEY =
  /(api[-_ ]?key|apikey|secret|token|password|passwd|pwd|authorization|auth[-_ ]?header|bearer|private[-_ ]?key|client[-_ ]?secret|access[-_ ]?key|signature|cookie|session[-_ ]?id|webhook[-_ ]?url|connection[-_ ]?string)/i;

const SECRET_VALUE: [RegExp, string][] = [
  [/\bsk-[A-Za-z0-9_-]{16,}/, "API key (sk-…)"],
  [/\bgsk_[A-Za-z0-9]{16,}/, "API key (gsk_…)"],
  [/\bAIza[0-9A-Za-z_-]{20,}/, "Google API key"],
  [/\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/, "GitHub token"],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, "Slack token"],
  [/\bEAA[A-Za-z0-9]{30,}/, "Facebook/WhatsApp access token"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/, "JWT"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i, "bearer token"],
  [/\bBasic\s+[A-Za-z0-9+/=]{12,}/i, "basic-auth header"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s"']*:[^\s"']*@/i,
    "connection string with a password",
  ],
  [
    /https?:\/\/[^\s"']*\/(?:webhook|webhook-test|hooks)\/[^\s"']+/i,
    "webhook URL",
  ],
  [/https:\/\/hooks\.slack\.com\/services\/\S+/i, "Slack webhook URL"],
  [
    /[?&](?:api[_-]?key|access[_-]?token|token|key|secret|sig|signature)=[^&\s"']{8,}/i,
    "URL with a key in the query",
  ],
];

const NODE_ID_KEYS = new Set(["credentials", "webhookid"]);

function preview(value: unknown): string {
  const s = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
  if (s.length <= 12) return s.length ? `${s[0]}…` : "";
  return `${s.slice(0, 4)}…${s.slice(-2)} (${s.length} chars)`;
}

/** Long, high-entropy strings that are probably keys (and not prose or URLs to images). */
function looksLikeKey(v: string): boolean {
  if (v.length < 32 || v.length > 400 || /\s/.test(v)) return false;
  if (!/^[A-Za-z0-9_\-+/=.]+$/.test(v)) return false;
  const classes =
    Number(/[a-z]/.test(v)) + Number(/[A-Z]/.test(v)) + Number(/\d/.test(v));
  if (classes < 3) return false;
  const unique = new Set(v).size;
  return unique >= 16;
}

function secretReason(value: string): string | null {
  for (const [re, reason] of SECRET_VALUE) if (re.test(value)) return reason;
  if (looksLikeKey(value)) return "long random-looking string (possible key)";
  return null;
}

/** Webhook trigger nodes: the path is part of the public URL, so it is removed. */
function isWebhookNode(node: Record<string, unknown>): boolean {
  return typeof node.type === "string" && /webhook/i.test(node.type);
}

export function sanitizeWorkflow(input: string): SanitizeResult {
  if (input.length > MAX_WORKFLOW_BYTES) {
    return { ok: false, error: "That file is larger than 2 MB." };
  }
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "This doesn't look like an n8n workflow." };
  }
  const root = data as Record<string, unknown>;
  if (!Array.isArray(root.nodes) || typeof root.connections !== "object") {
    return {
      ok: false,
      error:
        'This doesn\'t look like an n8n workflow (it needs "nodes" and "connections").',
    };
  }

  const removed: Removal[] = [];

  const walk = (value: unknown, path: string, inWebhook: boolean): unknown => {
    if (Array.isArray(value)) {
      return value.map((v, i) => walk(v, `${path}[${i}]`, inWebhook));
    }
    if (value && typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const webhookHere = inWebhook || isWebhookNode(obj);
      const out: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(obj)) {
        const here = path ? `${path}.${key}` : key;
        const lower = key.toLowerCase();

        if (lower in DROP_KEYS && DROP_KEYS[lower] !== "" && v !== undefined) {
          removed.push({
            path: here,
            reason: `Removed ${DROP_KEYS[lower]}`,
            preview: preview(v),
          });
          continue;
        }
        // credential references inside nodes carry an id + name of your account
        if (
          lower === "id" &&
          NODE_ID_KEYS.has(
            path
              .split(".")
              .pop()
              ?.replace(/\[\d+\]$/, "")
              .toLowerCase() ?? "",
          )
        ) {
          removed.push({
            path: here,
            reason: "Removed credential ID",
            preview: preview(v),
          });
          continue;
        }
        if (
          webhookHere &&
          lower === "path" &&
          typeof v === "string" &&
          v !== REDACTED
        ) {
          removed.push({
            path: here,
            reason: "Replaced webhook path",
            preview: preview(v),
          });
          out[key] = REDACTED;
          continue;
        }
        if (
          SECRET_KEY.test(key) &&
          typeof v === "string" &&
          v.trim() !== "" &&
          v !== REDACTED &&
          !v.trim().startsWith("={{")
        ) {
          removed.push({
            path: here,
            reason: `Replaced value of "${key}" (looks like a secret)`,
            preview: preview(v),
          });
          out[key] = REDACTED;
          continue;
        }
        out[key] = walk(v, here, webhookHere);
      }
      return out;
    }
    if (typeof value === "string") {
      // n8n expressions that only reference other data are safe
      const reason = secretReason(value);
      if (reason) {
        removed.push({
          path,
          reason: `Replaced ${reason}`,
          preview: preview(value),
        });
        return REDACTED;
      }
    }
    return value;
  };

  // metadata and secrets at the workflow level
  const cleaned = walk(root, "", false) as Record<string, unknown>;
  if (cleaned.meta && typeof cleaned.meta === "object") {
    const meta = cleaned.meta as Record<string, unknown>;
    for (const k of ["instanceId", "templateCredsSetupCompleted"]) {
      if (k in meta) {
        removed.push({
          path: `meta.${k}`,
          reason: "Removed instance metadata",
          preview: preview(meta[k]),
        });
        delete meta[k];
      }
    }
  }

  // credential names inside node.credentials were removed with the block;
  // note it once per node for the review screen
  return {
    ok: true,
    workflow: cleaned,
    removed,
    json: JSON.stringify(cleaned, null, 2),
  };
}

/** Summary line for the review screen. */
export function summarizeRemovals(removed: Removal[]): string {
  if (removed.length === 0) return "Nothing sensitive found.";
  const kinds = new Map<string, number>();
  for (const r of removed) kinds.set(r.reason, (kinds.get(r.reason) ?? 0) + 1);
  return [...kinds.entries()].map(([k, n]) => `${n} × ${k}`).join(" · ");
}
