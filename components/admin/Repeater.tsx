"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/admin/ui";

/** An editable list of rows (metrics, changelog, …) with add/move/remove. */
export function Repeater<T>({
  items,
  onChange,
  make,
  renderRow,
  addLabel,
  max = 50,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  renderRow: (
    item: T,
    update: (patch: Partial<T>) => void,
    index: number,
  ) => ReactNode;
  addLabel: string;
  max?: number;
}) {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-2xl border border-[#D7E2EA]/10 p-3"
        >
          <div className="min-w-0 flex-1">
            {renderRow(
              item,
              (patch) =>
                onChange(
                  items.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                ),
              i,
            )}
          </div>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
            >
              <ArrowUp className="size-3.5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              aria-label="Move down"
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
            >
              <ArrowDown className="size-3.5" aria-hidden />
            </Button>
            <Button
              variant="ghost"
              aria-label="Remove row"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-3.5 text-red-300" aria-hidden />
            </Button>
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button
          onClick={() => onChange([...items, make()])}
          className="self-start text-xs"
        >
          <Plus className="size-4" aria-hidden /> {addLabel}
        </Button>
      )}
    </div>
  );
}
