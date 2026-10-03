import { useEffect, useState, type FormEvent } from "react";
import type { ItineraryDay } from "../../shared/types";
import {
  BUDGET_FIELD_KEYS,
  BUDGET_FIELD_LABELS,
  budgetTotalFromForm,
  toBudgetFormValues,
  type DayBudgetFormValues,
} from "../lib/dayForm";
import { formatInr } from "../lib/format";
import { DayModalFormActions, DayModalShell } from "./DayModalShell";

type Props = {
  day: ItineraryDay;
  open: boolean;
  onClose: () => void;
  onSave: (values: DayBudgetFormValues) => Promise<void>;
};

export function DayBudgetModal({ day, open, onClose, onSave }: Props) {
  const [values, setValues] = useState<DayBudgetFormValues>(() =>
    toBudgetFormValues(day),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(toBudgetFormValues(day));
      setError(null);
    }
  }, [open, day]);

  const dayTotal = budgetTotalFromForm(values);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch {
      setError("Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DayModalShell
      open={open}
      title={`Day ${day.day_number} Budget`}
      titleId="day-budget-title"
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="mt-5 space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {BUDGET_FIELD_KEYS.map((key) => (
            <label key={key} className="block text-sm">
              <span className="font-medium text-slate-700">
                {BUDGET_FIELD_LABELS[key]}
              </span>
              <input
                type="number"
                min={0}
                value={values[key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [key]: e.target.value }))
                }
                className="input mt-1"
                placeholder="₹"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">Day Total</span>
          <span className="text-base font-semibold tabular-nums text-teal-700">
            {formatInr(dayTotal)}
          </span>
        </div>

        <DayModalFormActions
          saving={saving}
          saveLabel="Save Budget"
          onCancel={onClose}
        />
      </form>
    </DayModalShell>
  );
}
