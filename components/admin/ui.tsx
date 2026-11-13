"use client";

import { X } from "lucide-react";
import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/** Small, consistent form controls for the admin (dark theme). */

const control =
  "w-full rounded-xl border border-[#D7E2EA]/25 bg-white/[0.03] px-3 py-2 text-sm text-[#D7E2EA] outline-none placeholder:text-[#D7E2EA]/35 focus:border-[#D7E2EA]/70";

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-[#D7E2EA] text-[#0C0C0C] hover:bg-white",
    secondary:
      "border border-[#D7E2EA]/40 text-[#D7E2EA] hover:border-[#D7E2EA]",
    danger: "border border-red-400/50 text-red-300 hover:bg-red-500/10",
    ghost: "text-[#D7E2EA]/80 hover:text-[#D7E2EA]",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium tracking-wider uppercase opacity-70"
      >
        {label}
      </label>
      {children(id)}
      {hint && !error && <p className="text-xs opacity-50">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${control} min-h-24 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${control} ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-[#B600A8]"
      />
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && <span className="text-xs opacity-50">{hint}</span>}
      </span>
    </label>
  );
}

/** Free-text tags: type and press Enter or comma. */
export function TagInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className={`${control} flex flex-wrap items-center gap-2`}>
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-[#D7E2EA]/30 px-2 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="opacity-60 hover:opacity-100"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        className="min-w-24 flex-1 bg-transparent outline-none"
      />
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#D7E2EA]/15 p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-wide uppercase">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm opacity-60">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "error" | "success";
  children: ReactNode;
}) {
  const styles = {
    info: "border-[#D7E2EA]/25 bg-white/[0.03]",
    warning: "border-amber-400/40 bg-amber-400/10 text-amber-100",
    error: "border-red-400/40 bg-red-500/10 text-red-100",
    success: "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  }[tone];
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}
