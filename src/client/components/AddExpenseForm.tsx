import { useEffect, useState, type FormEvent } from "react";
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
import type { ItineraryDay } from "../../shared/types";
import type { DraftExpenseInput } from "../lib/draft-trips";

export type ExpenseFormValues = DraftExpenseInput;

type Props = {
  days: ItineraryDay[];
  initial?: Partial<ExpenseFormValues> & { id?: string };
  submitLabel: string;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel?: () => void;
};

export function AddExpenseForm({
  days,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const defaultCategory: ExpenseCategory = initial?.category ?? "travel";
  const initialType =
    initial?.expense_type &&
    isExpenseTypeForCategory(defaultCategory, initial.expense_type)
      ? (initial.expense_type as ExpenseType)
      : EXPENSE_TYPES_BY_CATEGORY[defaultCategory][0];

  const [category, setCategory] = useState<ExpenseCategory>(defaultCategory);
  const [expenseType, setExpenseType] = useState<ExpenseType>(initialType);
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [dayId, setDayId] = useState(initial?.day_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpenseTypeForCategory(category, expenseType)) {
      setExpenseType(EXPENSE_TYPES_BY_CATEGORY[category][0]);
    }
  }, [category, expenseType]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 1) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        category,
        expense_type: expenseType,
        amount: Math.round(parsed),
        day_id: dayId ? dayId : null,
      });
      if (!initial?.id) {
        setAmount("");
        setDayId("");
      }
    } catch {
      setError("Unable to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const typeOptions = EXPENSE_TYPES_BY_CATEGORY[category];

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <p className="text-sm font-semibold text-slate-900">Add Expense</p>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
          className="input mt-1"
        >
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {EXPENSE_CATEGORY_ICONS[cat]} {EXPENSE_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Expense</span>
        <select
          value={expenseType}
          onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
          className="input mt-1"
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {EXPENSE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Amount</span>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input mt-1"
          placeholder="₹"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Day (optional)</span>
        <select
          value={dayId}
          onChange={(e) => setDayId(e.target.value)}
          className="input mt-1"
        >
          <option value="">Whole trip</option>
          {days.map((d) => (
            <option key={d.id} value={d.id}>
              Day {d.day_number}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
