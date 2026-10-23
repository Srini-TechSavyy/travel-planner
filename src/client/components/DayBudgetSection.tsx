import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
  EXPENSE_TYPES_BY_CATEGORY,
  isExpenseTypeForCategory,
  type ExpenseCategory,
  type ExpenseType,
} from "../../shared/expenses";
import type { TripExpense } from "../../shared/types";
import type { DraftExpenseInput } from "../lib/draft-trips";
import { formatInr } from "../lib/format";

const MAX_AMOUNT = 100_000_000;
const STAY_DEFAULT_TYPE = "hotel_resort";

export type DayBudgetHandlers = {
  onCreateExpense: (input: DraftExpenseInput) => Promise<void>;
  onUpdateExpense: (
    id: string,
    input: Partial<DraftExpenseInput>,
  ) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
  onSaveStayName: (name: string) => Promise<void>;
};

/** Returns an integer rupee amount, or an error message. */
function parseAmount(raw: string): { value: number } | { error: string } {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) {
    return { error: "Enter a whole number in ₹ (no negatives or symbols)." };
  }
  const n = Number(t);
  if (n < 1) return { error: "Amount must be at least ₹1." };
  if (n > MAX_AMOUNT) return { error: "Amount is too large." };
  return { value: n };
}

function typeLabel(expense: TripExpense): string {
  return (
    EXPENSE_TYPE_LABELS[expense.expense_type as ExpenseType] ??
    expense.expense_type
  );
}

/* ------------------------------------------------------------------ */
/* Expense section                                                     */
/* ------------------------------------------------------------------ */

type ExpenseSectionProps = {
  dayId: string;
  /** Expenses to list (accommodation expense is shown in the stay block). */
  expenses: TripExpense[];
  handlers: DayBudgetHandlers;
  dayTotal: number | null;
};

export function DayExpenseSection({
  dayId,
  expenses,
  handlers,
  dayTotal,
}: ExpenseSectionProps) {
  const [adding, setAdding] = useState(false);

  return (
    <section
      aria-label="Day expenses"
      className="mt-4 border-t border-slate-100 pt-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">💰 Expenses</p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
          >
            + Add Expense
          </button>
        )}
      </div>

      <ul className="mt-1 divide-y divide-slate-100">
        {expenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} handlers={handlers} />
        ))}
        {adding && (
          <li className="py-2">
            <ExpenseEditor
              initial={null}
              onCancel={() => setAdding(false)}
              onSave={async (values) => {
                await handlers.onCreateExpense({ ...values, day_id: dayId });
                setAdding(false);
              }}
            />
          </li>
        )}
      </ul>

      {expenses.length === 0 && !adding && (
        <p className="py-1 text-xs text-slate-500">No expenses yet.</p>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
        <span className="font-medium text-slate-600">Daily estimated total</span>
        <span
          className="font-semibold tabular-nums text-teal-800"
          data-testid="day-total"
        >
          {formatInr(dayTotal ?? 0)}
        </span>
      </div>
    </section>
  );
}

function ExpenseRow({
  expense,
  handlers,
}: {
  expense: TripExpense;
  handlers: DayBudgetHandlers;
}) {
  const [editing, setEditing] = useState<"type" | "amount" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  async function handleDelete() {
    setMenuOpen(false);
    if (!window.confirm("Delete this expense?")) return;
    setBusy(true);
    setError(null);
    try {
      await handlers.onDeleteExpense(expense.id);
    } catch {
      setError("Unable to delete expense. Please try again.");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <li className="py-2">
        <ExpenseEditor
          initial={expense}
          focus={editing}
          onCancel={() => setEditing(null)}
          onSave={async (values) => {
            await handlers.onUpdateExpense(expense.id, values);
            setEditing(null);
          }}
        />
      </li>
    );
  }

  const cat = expense.category as ExpenseCategory;
  return (
    <li className={`py-1.5 ${busy ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setEditing("type")}
          disabled={busy}
          title="Click to edit"
          className="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-slate-800 hover:bg-slate-50"
        >
          <span aria-hidden>{EXPENSE_CATEGORY_ICONS[cat] ?? "📦"}</span>{" "}
          {typeLabel(expense)}
          {expense.notes && (
            <span className="ml-1 text-xs text-slate-500">
              · {expense.notes}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setEditing("amount")}
          disabled={busy}
          title="Click to edit"
          className="shrink-0 rounded px-1 py-0.5 font-semibold tabular-nums text-slate-900 hover:bg-slate-50"
        >
          {formatInr(expense.amount)}
        </button>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="Expense actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={busy}
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100"
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-10 mt-1 w-28 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  setEditing("type");
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-red-700 hover:bg-red-50"
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </li>
  );
}

type EditorValues = {
  category: ExpenseCategory;
  expense_type: string;
  amount: number;
  notes: string | null;
};

function ExpenseEditor({
  initial,
  focus = "type",
  onSave,
  onCancel,
}: {
  initial: TripExpense | null;
  focus?: "type" | "amount";
  onSave: (values: EditorValues) => Promise<void>;
  onCancel: () => void;
}) {
  const initCategory = (initial?.category as ExpenseCategory) ?? "food";
  const [category, setCategory] = useState<ExpenseCategory>(initCategory);
  const [expenseType, setExpenseType] = useState<string>(
    initial?.expense_type ?? EXPENSE_TYPES_BY_CATEGORY[initCategory][0],
  );
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : "",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (focus === "amount" ? amountRef : typeRef).current?.focus();
  }, [focus]);

  function changeCategory(next: ExpenseCategory) {
    setCategory(next);
    if (!isExpenseTypeForCategory(next, expenseType)) {
      setExpenseType(EXPENSE_TYPES_BY_CATEGORY[next][0]);
    }
  }

  async function save() {
    if (saving) return;
    const parsed = parseAmount(amount);
    if ("error" in parsed) {
      setError(parsed.error);
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        category,
        expense_type: expenseType,
        amount: parsed.value,
        notes: notes.trim() ? notes.trim() : null,
      });
    } catch {
      setError("Unable to save expense. Please try again.");
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div
      className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/40 p-2 text-sm"
      onKeyDown={onKeyDown}
    >
      <div className="grid grid-cols-2 gap-2">
        <select
          aria-label="Category"
          value={category}
          onChange={(e) => changeCategory(e.target.value as ExpenseCategory)}
          disabled={saving}
          className="input !py-1.5 text-sm"
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_ICONS[c]} {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          ref={typeRef}
          aria-label="Expense description"
          value={expenseType}
          onChange={(e) => setExpenseType(e.target.value)}
          disabled={saving}
          className="input !py-1.5 text-sm"
        >
          {EXPENSE_TYPES_BY_CATEGORY[category].map((t) => (
            <option key={t} value={t}>
              {EXPENSE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-[8rem_1fr] gap-2">
        <input
          ref={amountRef}
          aria-label="Amount in INR"
          inputMode="numeric"
          placeholder="₹ Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={saving}
          className="input !py-1.5 text-sm tabular-nums"
        />
        <input
          aria-label="Notes"
          placeholder="Notes (optional)"
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={saving}
          className="input !py-1.5 text-sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="btn-primary !px-3 !py-1 !text-xs"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="btn-secondary !px-3 !py-1 !text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accommodation (stay name + cost)                                    */
/* ------------------------------------------------------------------ */

export function StayInline({
  dayId,
  stayName,
  stayLocation,
  stayExpense,
  handlers,
}: {
  dayId: string;
  stayName: string;
  stayLocation: string;
  /** The day's primary accommodation (stay-category) expense, if any. */
  stayExpense: TripExpense | null;
  handlers: DayBudgetHandlers;
}) {
  const [editing, setEditing] = useState<"name" | "cost" | null>(null);
  const [name, setName] = useState(stayName);
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start(field: "name" | "cost") {
    setName(stayName);
    setCost(stayExpense ? String(stayExpense.amount) : "");
    setError(null);
    setEditing(field);
  }

  function cancel() {
    // Discard drafts; display values come from props, so the originals return.
    setEditing(null);
    setError(null);
  }

  async function save() {
    if (saving || !editing) return;
    setError(null);

    if (editing === "name") {
      const trimmed = name.trim();
      if (trimmed.length > 200) {
        setError("Name is too long.");
        return;
      }
      setSaving(true);
      try {
        await handlers.onSaveStayName(trimmed);
        setEditing(null);
      } catch {
        setError("Unable to save. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const parsed = parseAmount(cost);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    try {
      if (stayExpense) {
        await handlers.onUpdateExpense(stayExpense.id, {
          amount: parsed.value,
        });
      } else {
        await handlers.onCreateExpense({
          category: "stay",
          expense_type: STAY_DEFAULT_TYPE,
          amount: parsed.value,
          day_id: dayId,
        });
      }
      setEditing(null);
    } catch {
      setError("Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  const actions = (
    <span className="flex gap-1.5">
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="btn-primary !px-3 !py-1 !text-xs"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={cancel}
        disabled={saving}
        className="btn-secondary !px-3 !py-1 !text-xs"
      >
        Cancel
      </button>
    </span>
  );

  return (
    <div className="mt-1 space-y-1 text-slate-700">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {editing === "name" ? (
          <span className="flex flex-1 flex-wrap items-center gap-2">
            <input
              autoFocus
              aria-label="Property name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={saving}
              maxLength={200}
              className="input min-w-[10rem] flex-1 !py-1 text-sm"
            />
            {actions}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => start("name")}
            title="Click to edit"
            className="rounded px-1 py-0.5 text-left hover:bg-slate-50"
          >
            {stayName || (
              <span className="text-slate-400">Add property name</span>
            )}
            {stayLocation && (
              <span className="text-slate-500"> · {stayLocation}</span>
            )}
          </button>
        )}

        {editing === "cost" ? (
          <span className="flex items-center gap-2">
            <input
              autoFocus
              aria-label="Accommodation cost in INR"
              inputMode="numeric"
              placeholder="₹ Cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={saving}
              className="input w-28 !py-1 text-sm tabular-nums"
            />
            {actions}
          </span>
        ) : (
          editing !== "name" && (
            <button
              type="button"
              onClick={() => start("cost")}
              title="Click to edit"
              className="rounded px-1 py-0.5 font-semibold tabular-nums text-slate-900 hover:bg-slate-50"
            >
              {stayExpense ? (
                formatInr(stayExpense.amount)
              ) : (
                <span className="font-normal text-slate-400">+ Add cost</span>
              )}
            </button>
          )
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
