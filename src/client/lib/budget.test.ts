import assert from "node:assert/strict";
import { test } from "node:test";
import type { TripExpense } from "../../shared/types";
import {
  dayExpenseTotal,
  displayTripBudgetTotal,
  sharedExpenseTotal,
} from "./budget";

function exp(id: string, day_id: string | null, amount: number): TripExpense {
  return {
    id,
    trip_id: "t",
    day_id,
    category: "stay",
    expense_type: "hotel_resort",
    amount,
    notes: null,
    created_at: "",
    updated_at: "",
  };
}

test("shared and day totals are separate and sum to trip total", () => {
  const list = [exp("a", "d1", 10000), exp("b", "d1", 1500), exp("c", null, 800)];
  assert.equal(dayExpenseTotal(list), 11500);
  assert.equal(sharedExpenseTotal(list), 800);
  assert.equal(displayTripBudgetTotal(list, []), 12300);
});
