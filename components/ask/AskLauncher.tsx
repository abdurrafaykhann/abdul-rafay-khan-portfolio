"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AskChatLazy } from "./AskChatLazy";

/** Floating "Ask my AI" button that opens the chat in a dialog. */
export function AskLauncher() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="ask-dialog"
        className="fixed right-4 bottom-4 z-40 flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-sm font-medium tracking-widest text-white uppercase shadow-lg transition-[filter] hover:brightness-110 sm:right-6 sm:bottom-6"
        style={{
          background:
            "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
          outline: "2px solid #FFFFFF",
          outlineOffset: "-3px",
        }}
      >
        {open ? (
          <X className="size-4" aria-hidden />
        ) : (
          <MessageCircle className="size-4" aria-hidden />
        )}
        <span>{open ? "Close" : "Ask my AI"}</span>
      </button>

      {open && (
        <div
          id="ask-dialog"
          ref={panel}
          role="dialog"
          aria-label="Ask my AI"
          className="fixed right-4 bottom-20 z-40 max-h-[75svh] w-[min(92vw,34rem)] overflow-y-auto rounded-[28px] border-2 border-[#D7E2EA]/40 bg-[#0C0C0C]/95 p-5 shadow-2xl backdrop-blur sm:right-6 sm:bottom-24 sm:p-6"
        >
          <p className="mb-4 text-xs tracking-widest text-[#D7E2EA]/70 uppercase">
            Ask my AI · answers come only from Rafay&rsquo;s own content
          </p>
          <AskChatLazy autoFocus />
        </div>
      )}
    </>
  );
}
