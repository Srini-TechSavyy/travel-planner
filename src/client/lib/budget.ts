import {
  EXPENSE_CATEGORIES,
  summarizeTripExpenses,
  type ExpenseCategory,
} from "../../shared/expenses";
import type { ItineraryDay, TripExpense, TripExpenseSummary } from "../../shared/types";

export type BudgetCategories = {
  travel: number;
  stay: number;
  food: number;
  activities: number;
  other: number;
};

/** Legacy day-column aggregation (read-only fallback when no expense rows). */
export function dayCategoriesLegacy(day: ItineraryDay): BudgetCategories {
  return {
    travel: day.travel_budget ?? 0,
    stay: day.stay_budget ?? 0,
    food: day.restaurant_budget ?? 0,
    activities: day.activities_budget ?? 0,
    other: day.other_budget ?? 0,
  };
}

export function dayTotalLegacy(day: ItineraryDay): number {
  const c = dayCategoriesLegacy(day);
  return c.travel + c.stay + c.food + c.activities + c.other;
}

export function hasDayBudgetLegacy(day: ItineraryDay): boolean {
  return dayTotalLegacy(day) > 0;
}

export function tripTotalsLegacy(days: ItineraryDay[]): BudgetCategories & { total: number } {
  const sum: BudgetCategories = {
    travel: 0,
    stay: 0,
    food: 0,
    activities: 0,
    other: 0,
  };
  for (const day of days) {
    const c = dayCategoriesLegacy(day);
    sum.travel += c.travel;
    sum.stay += c.stay;
    sum.food += c.food;
    sum.activities += c.activities;
    sum.other += c.other;
  }
  const total =
    sum.travel + sum.stay + sum.food + sum.activities + sum.other;
  return { ...sum, total };
}

export function hasAnyTripBudgetLegacy(days: ItineraryDay[]): boolean {
  return tripTotalsLegacy(days).total > 0;
}

export function emptyExpenseSummary(): TripExpenseSummary {
  return { total: 0, byCategory: {}, byDayId: {} };
}

export function tripExpenseTotal(expenses: TripExpense[]): number {
  return summarizeTripExpenses(expenses).total;
}

export function hasTripExpenses(expenses: TripExpense[]): boolean {
  return expenses.length > 0;
}

export function categoryTotalsFromSummary(
  summary: TripExpenseSummary,
): BudgetCategories {
  const by = summary.byCategory;
  return {
    travel: by.travel ?? 0,
    stay: by.stay ?? 0,
    food: by.food ?? 0,
    activities: by.activities ?? 0,
    other: by.other ?? 0,
  };
}

export function dayAssignedTotal(
  dayId: string,
  summary: TripExpenseSummary,
): number {
  return summary.byDayId[dayId] ?? 0;
}

export function hasDayExpenseSummary(
  dayId: string,
  summary: TripExpenseSummary,
): boolean {
  return dayAssignedTotal(dayId, summary) > 0;
}

export function displayTripBudgetTotal(
  expenses: TripExpense[],
  days: ItineraryDay[],
): number {
  if (hasTripExpenses(expenses)) {
    return tripExpenseTotal(expenses);
  }
  return tripTotalsLegacy(days).total;
}

export function displayDayExpenseAmount(
  day: ItineraryDay,
  expenses: TripExpense[],
  summary: TripExpenseSummary,
): number | null {
  if (hasTripExpenses(expenses)) {
    const assigned = dayAssignedTotal(day.id, summary);
    return assigned > 0 ? assigned : null;
  }
  if (hasDayBudgetLegacy(day)) {
    return dayTotalLegacy(day);
  }
  return null;
}

export function categoriesWithTotals(
  summary: TripExpenseSummary,
): { category: ExpenseCategory; amount: number }[] {
  return EXPENSE_CATEGORIES.map((category) => ({
    category,
    amount: summary.byCategory[category] ?? 0,
  })).filter((row) => row.amount > 0);
}

/** @deprecated use legacy names above or expense helpers */
export const dayTotal = dayTotalLegacy;
export const hasDayBudget = hasDayBudgetLegacy;
export const tripTotals = tripTotalsLegacy;
export const hasAnyTripBudget = hasAnyTripBudgetLegacy;

/** Sum of expenses not assigned to a day (fuel, tolls, parking, …). */
export function sharedExpenseTotal(expenses: TripExpense[]): number {
  return expenses.filter((e) => !e.day_id).reduce((s, e) => s + e.amount, 0);
}

/** Sum of expenses assigned to any day. */
export function dayExpenseTotal(expenses: TripExpense[]): number {
  return expenses.filter((e) => e.day_id).reduce((s, e) => s + e.amount, 0);
}
