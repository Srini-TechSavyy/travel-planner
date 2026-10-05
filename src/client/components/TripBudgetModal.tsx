import { useMemo, useState } from "react";
import {
  EXPENSE_CATEGORY_ICONS,
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
  type ExpenseCategory,
  type ExpenseType,
} from "../../shared/expenses";
import type { ItineraryDay, TripExpense } from "../../shared/types";
import { categoriesWithTotals } from "../lib/budget";
import type { DraftExpenseInput } from "../lib/draft-trips";
import { formatInr } from "../lib/format";
import type { TripExpenseSummary } from "../../shared/types";
import { AddExpenseForm } from "./AddExpenseForm";
import { DayModalShell } from "./DayModalShell";

type Props = {
  open: boolean;
  onClose: () => void;
  days: ItineraryDay[];
  expenses: TripExpense[];
  summary: TripExpenseSummary;
  onCreateExpense: (input: DraftExpenseInput) => Promise<void>;
  onUpdateExpense: (
    id: string,
    input: Partial<DraftExpenseInput>,
  ) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
};

export function TripBudgetModal({
  open,
  onClose,
  days,
  expenses,
  summary,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TripExpense | null>(null);

  const dayById = useMemo(() => {
    const map = new Map<string, ItineraryDay>();
    for (const d of days) map.set(d.id, d);
    return map;
  }, [days]);

  const categoryRows = categoriesWithTotals(summary);

  const expensesByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, TripExpense[]>();
    for (const e of expenses) {
      const cat = e.category as ExpenseCategory;
      const list = map.get(cat) ?? [];
      list.push(e);
      map.set(cat, list);
    }
    return map;
  }, [expenses]);

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function handleDelete(expense: TripExpense) {
    if (!window.confirm("Delete this expense?")) return;
    await onDeleteExpense(expense.id);
    if (editing?.id === expense.id) closeForm();
  }

  return (
    <DayModalShell
      open={open}
      title="Trip Budget"
      titleId="trip-budget-title"
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Estimated Total
          </p>
          <p className="mt-1 text-3xl font-bold text-teal-700">
            {formatInr(summary.total)}
          </p>
        </div>

        {categoryRows.length > 0 && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            {categoryRows.map(({ category, amount }) => {
              const items = expensesByCategory.get(category) ?? [];
              return (
                <section key={category}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-800">
                      {EXPENSE_CATEGORY_ICONS[category]}{" "}
                      {EXPENSE_CATEGORY_LABELS[category]}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {formatInr(amount)}
                    </span>
                  </div>
                  {items.length > 0 && (
                    <ul className="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                      {items.map((expense) => {
                        const day = expense.day_id
                          ? dayById.get(expense.day_id)
                          : null;
                        const typeLabel =
                          EXPENSE_TYPE_LABELS[
                            expense.expense_type as ExpenseType
                          ] ?? expense.expense_type;
                        return (
                          <li
                            key={expense.id}
                            className="flex flex-wrap items-start justify-between gap-2 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800">
                                {typeLabel}
                              </p>
                              {day && (
                                <p className="text-xs text-slate-500">
                                  Day {day.day_number}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="font-semibold tabular-nums text-slate-900">
                                {formatInr(expense.amount)}
                              </span>
                              <button
                                type="button"
                                className="text-xs font-medium text-teal-700 hover:underline"
                                onClick={() => {
                                  setEditing(expense);
                                  setShowForm(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-xs font-medium text-slate-500 hover:text-red-700"
                                onClick={() => void handleDelete(expense)}
                              >
                                Delete
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-900">
              <span>Total</span>
              <span className="tabular-nums text-teal-700">
                {formatInr(summary.total)}
              </span>
            </div>
          </div>
        )}

        {categoryRows.length === 0 && !showForm && (
          <p className="text-sm text-slate-600">
            No expenses yet. Add your first expense below.
          </p>
        )}

        {showForm ? (
          <AddExpenseForm
            days={days}
            initial={
              editing
                ? {
                    id: editing.id,
                    category: editing.category as ExpenseCategory,
                    expense_type: editing.expense_type,
                    amount: editing.amount,
                    day_id: editing.day_id,
                  }
                : undefined
            }
            submitLabel={editing ? "Save Expense" : "Add Expense"}
            onCancel={closeForm}
            onSubmit={async (values) => {
              if (editing) {
                await onUpdateExpense(editing.id, values);
              } else {
                await onCreateExpense(values);
              }
              closeForm();
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="w-full rounded-xl border border-dashed border-teal-300 bg-teal-50 py-3 text-sm font-medium text-teal-800 hover:bg-teal-100"
          >
            + Add Expense
          </button>
        )}

        <button type="button" onClick={onClose} className="btn-secondary w-full">
          Close
        </button>
      </div>
    </DayModalShell>
  );
}
