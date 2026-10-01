import type { ItineraryDay } from "../../shared/types";

export type BudgetCategories = {
  travel: number;
  stay: number;
  restaurants: number;
  activities: number;
  other: number;
};

export function dayCategories(day: ItineraryDay): BudgetCategories {
  return {
    travel: day.travel_budget ?? 0,
    stay: day.stay_budget ?? 0,
    restaurants: day.restaurant_budget ?? 0,
    activities: day.activities_budget ?? 0,
    other: day.other_budget ?? 0,
  };
}

export function dayTotal(day: ItineraryDay): number {
  const c = dayCategories(day);
  return c.travel + c.stay + c.restaurants + c.activities + c.other;
}

export function hasDayBudget(day: ItineraryDay): boolean {
  return dayTotal(day) > 0;
}

export function tripTotals(days: ItineraryDay[]): BudgetCategories & { total: number } {
  const sum: BudgetCategories = {
    travel: 0,
    stay: 0,
    restaurants: 0,
    activities: 0,
    other: 0,
  };
  for (const day of days) {
    const c = dayCategories(day);
    sum.travel += c.travel;
    sum.stay += c.stay;
    sum.restaurants += c.restaurants;
    sum.activities += c.activities;
    sum.other += c.other;
  }
  const total =
    sum.travel + sum.stay + sum.restaurants + sum.activities + sum.other;
  return { ...sum, total };
}

export function hasAnyTripBudget(days: ItineraryDay[]): boolean {
  return tripTotals(days).total > 0;
}
