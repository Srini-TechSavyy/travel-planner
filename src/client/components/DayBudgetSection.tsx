import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_TYPES_BY_CATEGORY,
  type ExpenseCategory,
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

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const PENCIL = "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z";
const TRASH =
  "M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6h12zM10 11v6M14 11v6";
const CHECK = "M20 6L9 17l-5-5";
const CLOSE = "M18 6L6 18M6 6l12 12";
const PLUS = "M12 5v14M5 12h14";
const CALC =
  "M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01";

const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md transition disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Expense panel                                                       */
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
      className="flex h-full flex-col gap-2 border-t border-slate-200 bg-slate-50/50 p-4 lg:border-l lg:border-t-0"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Day Expenses</h4>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50"
          >
            <Icon d={PLUS} className="h-3.5 w-3.5" /> Add Expense
          </button>
        )}
      </div>

      <ul className="divide-y divide-slate-200 rounded-lg bg-white px-2 ring-1 ring-slate-200">
        {expenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} handlers={handlers} />
        ))}
        {adding && (
          <li className="py-2">
            <ExpenseEditor
              initial={null}
              onCancel={() => setAdding(false)}
              onSave={async (values) => {
                await handlers.onCreateExpense({
                  category: values.category,
                  expense_type: EXPENSE_TYPES_BY_CATEGORY[values.category][0],
                  amount: values.amount,
                  day_id: dayId,
                });
                setAdding(false);
              }}
            />
          </li>
        )}
        {expenses.length === 0 && !adding && (
          <li className="py-3 text-center text-xs text-slate-500">
            No expenses yet.
          </li>
        )}
      </ul>

      <div className="mt-auto flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2.5 ring-1 ring-teal-100">
        <span className="flex items-center gap-2 text-sm font-semibold text-teal-900">
          <Icon d={CALC} className="h-4 w-4 text-teal-700" /> Daily Total
        </span>
        <span
          className="text-lg font-bold tabular-nums text-teal-800"
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
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await handlers.onDeleteExpense(expense.id);
    } catch {
      setError("Unable to delete expense. Please try again.");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <li className="py-2">
        <ExpenseEditor
          initial={expense}
          onCancel={() => setEditing(false)}
          onSave={async (values) => {
            const categoryChanged = values.category !== expense.category;
            await handlers.onUpdateExpense(
              expense.id,
              categoryChanged
                ? {
                    category: values.category,
                    expense_type: EXPENSE_TYPES_BY_CATEGORY[values.category][0],
                    amount: values.amount,
                  }
                : { amount: values.amount },
            );
            setEditing(false);
          }}
        />
      </li>
    );
  }

  const cat = expense.category as ExpenseCategory;
  return (
    <li className={`py-1.5 ${busy ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2 text-sm">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100"
          aria-hidden
        >
          {EXPENSE_CATEGORY_ICONS[cat] ?? "📦"}
        </span>
        <span className="min-w-0 flex-1 truncate text-slate-800">
          {EXPENSE_CATEGORY_LABELS[cat] ?? expense.category}
        </span>
        {confirming ? (
          <span className="flex shrink-0 items-center gap-1.5 text-xs">
            <span className="text-slate-600">Delete?</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Yes
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
            >
              No
            </button>
          </span>
        ) : (
          <>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">
              {formatInr(expense.amount)}
            </span>
            <button
              type="button"
              aria-label="Edit expense"
              disabled={busy}
              onClick={() => setEditing(true)}
              className={`${iconBtn} text-slate-500 hover:bg-slate-100 hover:text-teal-700`}
            >
              <Icon d={PENCIL} />
            </button>
            <button
              type="button"
              aria-label="Delete expense"
              disabled={busy}
              onClick={() => setConfirming(true)}
              className={`${iconBtn} text-red-500 hover:bg-red-50`}
            >
              <Icon d={TRASH} />
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </li>
  );
}

type EditorValues = { category: ExpenseCategory; amount: number };

function ExpenseEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: TripExpense | null;
  onSave: (values: EditorValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<ExpenseCategory | "">(
    (initial?.category as ExpenseCategory) ?? "",
  );
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    categoryRef.current?.focus();
  }, []);

  async function save() {
    if (saving) return;
    if (!category) {
      setError("Select a category.");
      categoryRef.current?.focus();
      return;
    }
    const parsed = parseAmount(amount);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ category, amount: parsed.value });
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
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-1.5">
        <select
          ref={categoryRef}
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          disabled={saving}
          className="input min-w-0 flex-1 !px-2 !py-1.5 text-sm"
        >
          <option value="" disabled>
            Select category
          </option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {EXPENSE_CATEGORY_ICONS[c]} {EXPENSE_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <input
          aria-label="Amount in INR"
          inputMode="numeric"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={saving}
          className="input w-24 !px-2 !py-1.5 text-sm tabular-nums"
        />
        <button
          type="button"
          aria-label="Save expense"
          onClick={() => void save()}
          disabled={saving}
          className={`${iconBtn} h-8 w-8 bg-teal-600 text-white hover:bg-teal-700`}
        >
          <Icon d={CHECK} />
        </button>
        <button
          type="button"
          aria-label="Cancel"
          onClick={onCancel}
          disabled={saving}
          className={`${iconBtn} h-8 w-8 border border-slate-200 text-slate-600 hover:bg-slate-100`}
        >
          <Icon d={CLOSE} />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
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
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(stayName);
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function start() {
    setName(stayName);
    setCost(stayExpense ? String(stayExpense.amount) : "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    // Drafts are discarded; display values come from props.
    setEditing(false);
    setError(null);
  }

  async function save() {
    if (saving || !editing) return;
    setError(null);

    const trimmed = name.trim();
    if (trimmed.length > 200) {
      setError("Name is too long.");
      return;
    }

    const costText = cost.trim();
    const costChanged = stayExpense
      ? costText !== String(stayExpense.amount)
      : costText !== "";
    let amount: number | null = null;
    if (costChanged) {
      const parsed = parseAmount(costText);
      if ("error" in parsed) {
        setError(parsed.error);
        return;
      }
      amount = parsed.value;
    }

    setSaving(true);
    try {
      if (trimmed !== stayName) await handlers.onSaveStayName(trimmed);
      if (amount !== null) {
        if (stayExpense) {
          await handlers.onUpdateExpense(stayExpense.id, { amount });
        } else {
          await handlers.onCreateExpense({
            category: "stay",
            expense_type: STAY_DEFAULT_TYPE,
            amount,
            day_id: dayId,
          });
        }
      }
      setEditing(false);
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

  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span aria-hidden>🏨</span> Stay
      </div>

      {editing ? (
        <div className="mt-2 space-y-2" onKeyDown={onKeyDown}>
          <div className="flex flex-wrap gap-2">
            <input
              autoFocus
              aria-label="Property name"
              placeholder="Property name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              maxLength={200}
              className="input min-w-[10rem] flex-1 !py-1.5 text-sm"
            />
            <input
              aria-label="Accommodation cost in INR"
              inputMode="numeric"
              placeholder="₹ Nightly cost"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={saving}
              className="input w-36 !py-1.5 text-sm tabular-nums"
            />
          </div>
          {stayLocation && (
            <p className="text-xs text-slate-500">{stayLocation}</p>
          )}
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
              className="btn-primary !px-4 !py-1.5 !text-xs"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={saving}
              className="btn-secondary !px-4 !py-1.5 !text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {stayName || (
                <span className="font-normal text-slate-400">
                  Add property name
                </span>
              )}
            </p>
            {stayLocation && (
              <p className="truncate text-xs text-slate-500">{stayLocation}</p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            <div className="text-right">
              <p className="font-semibold tabular-nums text-slate-900">
                {stayExpense ? (
                  formatInr(stayExpense.amount)
                ) : (
                  <span className="font-normal text-slate-400">No cost</span>
                )}
              </p>
              <p className="text-xs text-slate-500">1 night</p>
            </div>
            <button
              type="button"
              aria-label="Edit accommodation"
              onClick={start}
              className={`${iconBtn} text-teal-700 hover:bg-teal-50`}
            >
              <Icon d={PENCIL} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
