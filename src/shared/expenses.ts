export const EXPENSE_CATEGORIES = [
  "travel",
  "stay",
  "food",
  "activities",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  travel: "🚗",
  stay: "🏨",
  food: "🍽",
  activities: "🎟",
  other: "📦",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  travel: "Travel",
  stay: "Stay",
  food: "Food",
  activities: "Activities",
  other: "Other",
};

export const EXPENSE_TYPES_BY_CATEGORY = {
  travel: [
    "car_fuel",
    "toll_parking",
    "flight_fare",
    "train_fare",
    "bus_fare",
    "taxi_local_transport",
  ],
  stay: ["hotel_resort", "homestay", "other_stay"],
  food: ["breakfast", "lunch", "dinner", "snacks", "other_food"],
  activities: ["entry_tickets", "experiences", "tours", "other_activity"],
  other: ["shopping", "miscellaneous"],
} as const satisfies Record<ExpenseCategory, readonly string[]>;

export type ExpenseType =
  (typeof EXPENSE_TYPES_BY_CATEGORY)[ExpenseCategory][number];

export const ALL_EXPENSE_TYPES = [
  ...EXPENSE_TYPES_BY_CATEGORY.travel,
  ...EXPENSE_TYPES_BY_CATEGORY.stay,
  ...EXPENSE_TYPES_BY_CATEGORY.food,
  ...EXPENSE_TYPES_BY_CATEGORY.activities,
  ...EXPENSE_TYPES_BY_CATEGORY.other,
] as const;

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  car_fuel: "Car Fuel",
  toll_parking: "Toll & Parking",
  flight_fare: "Flight Fare",
  train_fare: "Train Fare",
  bus_fare: "Bus Fare",
  taxi_local_transport: "Taxi / Local Transport",
  hotel_resort: "Hotel / Resort",
  homestay: "Homestay",
  other_stay: "Other Stay",
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
  other_food: "Other Food",
  entry_tickets: "Entry Tickets",
  experiences: "Experiences",
  tours: "Tours",
  other_activity: "Other Activity",
  shopping: "Shopping",
  miscellaneous: "Miscellaneous",
};

export function isExpenseTypeForCategory(
  category: ExpenseCategory,
  expenseType: string,
): expenseType is ExpenseType {
  return (EXPENSE_TYPES_BY_CATEGORY[category] as readonly string[]).includes(
    expenseType,
  );
}

export function categoryForExpenseType(expenseType: string): ExpenseCategory | null {
  for (const cat of EXPENSE_CATEGORIES) {
    if ((EXPENSE_TYPES_BY_CATEGORY[cat] as readonly string[]).includes(expenseType)) {
      return cat;
    }
  }
  return null;
}

/** Default catch-all type when migrating legacy day budget columns */
export const LEGACY_DAY_BUDGET_EXPENSE_TYPE: Record<
  "travel" | "stay" | "food" | "activities" | "other",
  ExpenseType
> = {
  travel: "taxi_local_transport",
  stay: "other_stay",
  food: "other_food",
  activities: "other_activity",
  other: "miscellaneous",
};

export type ExpenseSummary = {
  total: number;
  byCategory: Record<string, number>;
  byDayId: Record<string, number>;
};

export function summarizeTripExpenses(
  expenses: { amount: number; category: string; day_id: string | null }[],
): ExpenseSummary {
  const byCategory: Record<string, number> = {};
  const byDayId: Record<string, number> = {};
  let total = 0;

  for (const e of expenses) {
    total += e.amount;
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    if (e.day_id) {
      byDayId[e.day_id] = (byDayId[e.day_id] ?? 0) + e.amount;
    }
  }

  return { total, byCategory, byDayId };
}
