"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ error }: { error?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    sendMagicLink,
    { status: "idle" },
  );

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm">
        <span className="tracking-widest uppercase opacity-70">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-full border-2 border-[#D7E2EA]/40 bg-transparent px-5 py-3 text-base outline-none focus:border-[#D7E2EA]"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#D7E2EA] px-6 py-3 font-medium tracking-widest text-[#0C0C0C] uppercase disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p role="status" aria-live="polite" className="min-h-6 text-sm">
        {state.message ?? error ?? ""}
      </p>
    </form>
  );
}
