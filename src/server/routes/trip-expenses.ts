import { Hono } from "hono";
import type { Env } from "../../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import {
  createExpense,
  deleteExpense,
  getExpenseForTrip,
  listExpensesForTrip,
  summarizeTripExpenses,
  updateExpense,
} from "../db/trip-expenses";
import { getTripForUser } from "../db/trips";
import { createExpenseSchema, updateExpenseSchema } from "../validation";

export const tripExpenseRoutes = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

tripExpenseRoutes.use("*", requireAuth);

async function assertTripOwned(
  c: { env: Env; get: (key: "user") => { id: string } },
  tripId: string,
) {
  const user = c.get("user");
  return getTripForUser(c.env.DB, tripId, user.id);
}

tripExpenseRoutes.get("/:tripId/expenses", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await assertTripOwned(c, tripId);
  if (!trip) return c.json({ error: "Trip not found" }, 404);

  const expenses = await listExpensesForTrip(c.env.DB, tripId);
  const summary = summarizeTripExpenses(expenses);
  return c.json({ expenses, summary });
});

tripExpenseRoutes.post("/:tripId/expenses", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await assertTripOwned(c, tripId);
  if (!trip) return c.json({ error: "Trip not found" }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid expense data", details: parsed.error.flatten() },
      400,
    );
  }

  const expense = await createExpense(c.env.DB, tripId, {
    category: parsed.data.category,
    expense_type: parsed.data.expense_type,
    amount: parsed.data.amount,
    day_id: parsed.data.day_id ?? null,
    notes: parsed.data.notes ?? null,
  });
  if (!expense) {
    return c.json({ error: "Unable to create expense" }, 400);
  }

  const expenses = await listExpensesForTrip(c.env.DB, tripId);
  return c.json({ expense, summary: summarizeTripExpenses(expenses) }, 201);
});

tripExpenseRoutes.patch("/:tripId/expenses/:expenseId", async (c) => {
  const tripId = c.req.param("tripId");
  const expenseId = c.req.param("expenseId");
  const trip = await assertTripOwned(c, tripId);
  if (!trip) return c.json({ error: "Trip not found" }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = updateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid expense data", details: parsed.error.flatten() },
      400,
    );
  }

  const expense = await updateExpense(c.env.DB, tripId, expenseId, parsed.data);
  if (!expense) {
    const exists = await getExpenseForTrip(c.env.DB, tripId, expenseId);
    if (!exists) return c.json({ error: "Expense not found" }, 404);
    return c.json({ error: "Unable to update expense" }, 400);
  }

  const expenses = await listExpensesForTrip(c.env.DB, tripId);
  return c.json({ expense, summary: summarizeTripExpenses(expenses) });
});

tripExpenseRoutes.delete("/:tripId/expenses/:expenseId", async (c) => {
  const tripId = c.req.param("tripId");
  const expenseId = c.req.param("expenseId");
  const trip = await assertTripOwned(c, tripId);
  if (!trip) return c.json({ error: "Trip not found" }, 404);

  const deleted = await deleteExpense(c.env.DB, tripId, expenseId);
  if (!deleted) return c.json({ error: "Expense not found" }, 404);

  const expenses = await listExpensesForTrip(c.env.DB, tripId);
  return c.json({ ok: true, summary: summarizeTripExpenses(expenses) });
});
