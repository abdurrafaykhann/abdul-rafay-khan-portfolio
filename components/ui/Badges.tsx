import { STATUS_LABELS, type Badge } from "@/lib/data/select";
import type { ProjectStatus } from "@/lib/data/types";

const STATUS_DOT: Record<ProjectStatus, string> = {
  live: "#3DDC84",
  completed: "#D7E2EA",
  in_progress: "#FF9F43",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="text-mist inline-flex items-center gap-2 rounded-full border border-[#D7E2EA]/30 px-3 py-1 text-[0.7rem] font-medium tracking-widest whitespace-nowrap uppercase">
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: STATUS_DOT[status] }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** A result or traction number shown on a project card. */
export function MetricBadge({ badge }: { badge: Badge }) {
  return (
    <span className="text-mist inline-flex items-baseline gap-2 rounded-full border border-[#D7E2EA]/30 px-4 py-1.5 text-xs sm:text-sm">
      <strong className="font-semibold text-white">{badge.value}</strong>
      <span className="opacity-70">
        {badge.label}
        {badge.note ? ` (${badge.note})` : ""}
      </span>
    </span>
  );
}
