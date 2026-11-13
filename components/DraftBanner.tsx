import { draftMode } from "next/headers";

/** Shown only to the admin while draft preview is on. */
export async function DraftBanner() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-[#BE4C00] px-4 py-2 text-center text-sm font-medium text-white"
    >
      <span>Draft preview: unpublished projects are visible only to you.</span>
      {/* plain <a>: this must be a real request, never prefetched */}
      <a href="/api/draft?exit=1" className="underline underline-offset-2">
        Exit preview
      </a>
    </div>
  );
}
