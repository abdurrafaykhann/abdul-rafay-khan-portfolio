"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Notice } from "@/components/admin/ui";
import {
  previewWorkflow,
  removeWorkflow,
  saveWorkflow,
  type WorkflowPreview,
} from "@/lib/admin/actions";
import { storageUrl } from "@/lib/storage-url";

/**
 * Upload an exported n8n workflow. It is cleaned on the server (credentials,
 * webhook paths, secrets…), you review exactly what was removed, and only the
 * cleaned file is stored. The original is never saved anywhere.
 */
export function WorkflowUploader({
  projectId,
  currentPath,
}: {
  projectId: string;
  currentPath: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(currentPath);
  const [review, setReview] = useState<WorkflowPreview | null>(null);
  const [message, setMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);
  const [pending, start] = useTransition();

  if (!projectId) {
    return (
      <p className="text-xs opacity-60">
        Save the project first, then you can attach a workflow download.
      </p>
    );
  }

  const url = path ? storageUrl(path) : null;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs font-medium tracking-wider uppercase opacity-70">
        Workflow download (optional)
      </span>
      <p className="text-xs text-amber-200/80">
        Credentials, webhook URLs and anything that looks like a secret are
        removed first, and you will see exactly what before anything is saved.
        Blur customer data in any screenshots too.
      </p>

      {url && !review && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a href={url} target="_blank" rel="noreferrer" className="underline">
            Current cleaned workflow
          </a>
          <Button
            variant="ghost"
            className="text-xs"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await removeWorkflow(projectId);
                if (res.ok) {
                  setPath(null);
                  setMessage({
                    tone: "success",
                    text: "Workflow download removed.",
                  });
                } else setMessage({ tone: "error", text: res.error });
              })
            }
          >
            Remove
          </Button>
        </div>
      )}

      {!review && (
        <div>
          <Button
            className="text-xs"
            disabled={pending}
            onClick={() => input.current?.click()}
          >
            {pending
              ? "Checking…"
              : path
                ? "Replace workflow…"
                : "Choose workflow JSON…"}
          </Button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Upload n8n workflow JSON"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                return setMessage({
                  tone: "error",
                  text: "That file is larger than 2 MB.",
                });
              }
              start(async () => {
                setMessage(null);
                const res = await previewWorkflow(await file.text());
                if (res.ok) setReview(res.data);
                else setMessage({ tone: "error", text: res.error });
              });
            }}
          />
        </div>
      )}

      {review && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#D7E2EA]/25 p-4">
          <p className="text-sm font-medium">{review.summary}</p>
          {review.removed.length > 0 && (
            <ul
              aria-label="What was removed"
              className="max-h-64 overflow-y-auto rounded-xl bg-white/[0.03] p-3 font-mono text-xs"
            >
              {review.removed.map((r, i) => (
                <li
                  key={`${r.path}-${i}`}
                  className="border-b border-[#D7E2EA]/10 py-1.5 last:border-0"
                >
                  <span className="text-red-300">− {r.path}</span>
                  <span className="opacity-60"> · {r.reason}</span>
                  <span className="opacity-40"> · {r.preview}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveWorkflow(projectId, review.json);
                  if (res.ok) {
                    setPath(res.data.path);
                    setReview(null);
                    setMessage({
                      tone: "success",
                      text: "Cleaned workflow saved.",
                    });
                  } else setMessage({ tone: "error", text: res.error });
                })
              }
            >
              {pending ? "Saving…" : "Looks right, save the cleaned file"}
            </Button>
            <Button disabled={pending} onClick={() => setReview(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && <Notice tone={message.tone}>{message.text}</Notice>}
    </div>
  );
}
