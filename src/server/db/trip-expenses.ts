import {
  LEGACY_DAY_BUDGET_EXPENSE_TYPE,
  summarizeTripExpenses,
  type ExpenseCategory,
} from "../../shared/expenses";
import type { TripExpense } from "../../shared/types";
import { nowIso } from "./client";

type ExpenseRow = {
  id: string;
  trip_id: string;
  day_id: string | null;
  category: string;
  expense_type: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function rowToExpense(row: ExpenseRow): TripExpense {
  return row;
}

export { summarizeTripExpenses };

export async function listExpensesForTrip(
  db: D1Database,
  tripId: string,
): Promise<TripExpense[]> {
  const result = await db
    .prepare(
      `SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY created_at ASC, id ASC`,
    )
    .bind(tripId)
    .all<ExpenseRow>();
  return (result.results ?? []).map(rowToExpense);
}

async function dayBelongsToTrip(
  db: D1Database,
  tripId: string,
  dayId: string,
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT id FROM itinerary_days WHERE id = ? AND trip_id = ?`)
    .bind(dayId, tripId)
    .first<{ id: string }>();
  return !!row;
}

export async function getExpenseForTrip(
  db: D1Database,
  tripId: string,
  expenseId: string,
): Promise<TripExpense | null> {
  const row = await db
    .prepare(`SELECT * FROM trip_expenses WHERE id = ? AND trip_id = ?`)
    .bind(expenseId, tripId)
    .first<ExpenseRow>();
  return row ? rowToExpense(row) : null;
}

export type CreateExpenseInput = {
  category: ExpenseCategory;
  expense_type: string;
  amount: number;
  day_id?: string | null;
  notes?: string | null;
};

export async function createExpense(
  db: D1Database,
  tripId: string,
  input: CreateExpenseInput,
): Promise<TripExpense | null> {
  const dayId = input.day_id ?? null;
  if (dayId) {
    const ok = await dayBelongsToTrip(db, tripId, dayId);
    if (!ok) return null;
  }

  const id = crypto.randomUUID();
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO trip_expenses (
        id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tripId,
      dayId,
      input.category,
      input.expense_type,
      input.amount,
      input.notes ?? null,
      ts,
      ts,
    )
    .run();

  return getExpenseForTrip(db, tripId, id);
}

export type UpdateExpenseInput = {
  category?: ExpenseCategory;
  expense_type?: string;
  amount?: number;
  day_id?: string | null;
  notes?: string | null;
};

export async function updateExpense(
  db: D1Database,
  tripId: string,
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<TripExpense | null> {
  const existing = await getExpenseForTrip(db, tripId, expenseId);
  if (!existing) return null;

  const category = input.category ?? (existing.category as ExpenseCategory);
  const expenseType = input.expense_type ?? existing.expense_type;
  const amount = input.amount ?? existing.amount;
  const dayId =
    input.day_id !== undefined ? input.day_id : existing.day_id;
  const notes = input.notes !== undefined ? input.notes : existing.notes;

  if (dayId) {
    const ok = await dayBelongsToTrip(db, tripId, dayId);
    if (!ok) return null;
  }

  const ts = nowIso();
  await db
    .prepare(
      `UPDATE trip_expenses SET
        category = ?,
        expense_type = ?,
        amount = ?,
        day_id = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ? AND trip_id = ?`,
    )
    .bind(category, expenseType, amount, dayId, notes, ts, expenseId, tripId)
    .run();

  return getExpenseForTrip(db, tripId, expenseId);
}

export async function deleteExpense(
  db: D1Database,
  tripId: string,
  expenseId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM trip_expenses WHERE id = ? AND trip_id = ?`)
    .bind(expenseId, tripId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

type DayBudgetRow = {
  id: string;
  trip_id: string;
  travel_budget: number | null;
  stay_budget: number | null;
  restaurant_budget: number | null;
  activities_budget: number | null;
  other_budget: number | null;
  updated_at: string;
};

const LEGACY_BUDGET_COLUMNS: {
  column: keyof DayBudgetRow;
  category: ExpenseCategory;
}[] = [
  { column: "travel_budget", category: "travel" },
  { column: "stay_budget", category: "stay" },
  { column: "restaurant_budget", category: "food" },
  { column: "activities_budget", category: "activities" },
  { column: "other_budget", category: "other" },
];

export async function backfillExpensesFromDayBudgets(
  db: D1Database,
  tripId: string,
): Promise<void> {
  const existing = await db
    .prepare(`SELECT COUNT(*) as c FROM trip_expenses WHERE trip_id = ?`)
    .bind(tripId)
    .first<{ c: number }>();
  if ((existing?.c ?? 0) > 0) return;

  const days = await db
    .prepare(
      `SELECT id, trip_id, travel_budget, stay_budget, restaurant_budget, activities_budget, other_budget, updated_at
       FROM itinerary_days WHERE trip_id = ?`,
    )
    .bind(tripId)
    .all<DayBudgetRow>();

  const statements: D1PreparedStatement[] = [];
  const ts = nowIso();

  for (const day of days.results ?? []) {
    for (const { column, category } of LEGACY_BUDGET_COLUMNS) {
      const amount = day[column];
      if (typeof amount !== "number" || amount <= 0) continue;
      const expenseType = LEGACY_DAY_BUDGET_EXPENSE_TYPE[category];
      statements.push(
        db
          .prepare(
            `INSERT INTO trip_expenses (
              id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            tripId,
            day.id,
            category,
            expenseType,
            amount,
            "Migrated from day budget",
            day.updated_at ?? ts,
            day.updated_at ?? ts,
          ),
      );
    }
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

export async function insertImportedExpenses(
  db: D1Database,
  tripId: string,
  expenses: {
    id?: string;
    day_id?: string | null;
    category: ExpenseCategory;
    expense_type: string;
    amount: number;
    notes?: string | null;
  }[],
): Promise<void> {
  if (expenses.length === 0) return;
  const ts = nowIso();
  const statements = expenses.map((e) =>
    db
      .prepare(
        `INSERT INTO trip_expenses (
          id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        e.id ?? crypto.randomUUID(),
        tripId,
        e.day_id ?? null,
        e.category,
        e.expense_type,
        e.amount,
        e.notes ?? null,
        ts,
        ts,
      ),
  );
  await db.batch(statements);
}
