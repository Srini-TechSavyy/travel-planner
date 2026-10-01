import { useState, type KeyboardEvent } from "react";
import type { DayListItem } from "../../shared/types";

type Props = {
  label: string;
  icon?: string;
  items: DayListItem[];
  onChange: (items: DayListItem[]) => void;
  addLabel: string;
};

export function InlineNameList({
  label,
  icon,
  items,
  onChange,
  addLabel,
}: Props) {
  const [draft, setDraft] = useState("");

  function commitAdd() {
    const name = draft.trim();
    if (!name) return;
    const next: DayListItem[] = [
      ...items,
      { id: crypto.randomUUID(), name, sort_order: items.length },
    ];
    onChange(next);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitAdd();
    }
  }

  function updateItem(id: string, name: string) {
    onChange(
      items.map((item) => (item.id === id ? { ...item, name } : item)),
    );
  }

  function removeItem(id: string) {
    onChange(
      items
        .filter((item) => item.id !== id)
        .map((item, i) => ({ ...item, sort_order: i })),
    );
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">
        {icon ? `${icon} ` : ""}
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0 items-center gap-2">
            <input
              value={item.name}
              onChange={(e) => updateItem(item.id, e.target.value)}
              className="input min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="shrink-0 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
        <li className="flex min-w-0 items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className="input min-w-0 flex-1"
            placeholder={addLabel}
          />
          <button
            type="button"
            onClick={commitAdd}
            className="shrink-0 rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
          >
            +
          </button>
        </li>
      </ul>
    </div>
  );
}
