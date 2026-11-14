"use client";

import { useState } from "react";

type State =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent" }
  | { status: "error"; message: string };

const field =
  "w-full rounded-[28px] border-2 border-[#D7E2EA]/40 bg-transparent px-6 py-3.5 text-base text-[#D7E2EA] outline-none placeholder:text-[#D7E2EA]/40 focus:border-[#D7E2EA]";

export function ContactForm() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setState({ status: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && body.ok) {
        form.reset();
        setState({ status: "sent" });
      } else {
        setState({
          status: "error",
          message: body.error ?? "Something went wrong.",
        });
      }
    } catch {
      setState({
        status: "error",
        message: "Couldn't send. Check your connection and try again.",
      });
    }
  }

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="text-mist rounded-[28px] border-2 border-[#D7E2EA]/40 p-8 text-lg"
      >
        Thanks, your message is on its way. I&rsquo;ll reply to the email you
        gave.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-2 text-xs tracking-widest text-[#D7E2EA] uppercase">
        Name
        <input
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-2 text-xs tracking-widest text-[#D7E2EA] uppercase">
        Email
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-2 text-xs tracking-widest text-[#D7E2EA] uppercase">
        Message
        <textarea
          name="message"
          required
          minLength={5}
          maxLength={4000}
          rows={5}
          className={`${field} resize-y`}
        />
      </label>
      {/* honeypot: hidden from people and screen readers, bots fill it in */}
      <div
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button
        type="submit"
        disabled={state.status === "sending"}
        className="mt-2 inline-block w-fit cursor-pointer rounded-full px-10 py-3.5 text-sm font-medium tracking-widest text-white uppercase transition-[filter] duration-200 hover:brightness-110 disabled:opacity-60 md:px-12 md:py-4 md:text-base"
        style={{
          background:
            "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
          boxShadow:
            "0px 4px 4px rgba(181, 1, 167, 0.25), 4px 4px 12px #7721B1 inset",
          outline: "2px solid #FFFFFF",
          outlineOffset: "-3px",
        }}
      >
        {state.status === "sending" ? "Sending…" : "Send message"}
      </button>
      <p
        role="alert"
        aria-live="polite"
        className="min-h-6 text-sm text-red-300"
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
