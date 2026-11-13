"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, type ReactNode } from "react";

function Row({
  id,
  disabled,
  label,
  children,
}: {
  id: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border border-[#D7E2EA]/15 bg-[#0C0C0C] p-3 ${
        isDragging ? "relative z-10 border-[#D7E2EA]/60 shadow-2xl" : ""
      }`}
      data-sortable-row={id}
    >
      {!disabled && (
        <button
          type="button"
          aria-label={`Drag to reorder ${label}`}
          className="cursor-grab touch-none rounded-lg p-1 opacity-50 hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

/**
 * Drag-to-reorder list (mouse, touch and keyboard: focus a handle, press
 * Space, move with the arrow keys, Space again to drop).
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  getLabel,
  disabled = false,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  getLabel: (item: T) => string;
  disabled?: boolean;
}) {
  // Stable id for dnd-kit's accessibility attributes, so the server and
  // browser render the same aria-describedby (prevents a hydration mismatch).
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  };

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex flex-col gap-2">
          {items.map((item, i) => (
            <Row
              key={item.id}
              id={item.id}
              disabled={disabled}
              label={getLabel(item)}
            >
              {renderItem(item, i)}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
