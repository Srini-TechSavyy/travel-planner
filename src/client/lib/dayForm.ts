import type { DayListItem, ItineraryDay } from "../../shared/types";

export type DayFormValues = {
  date: string;
  from_location: string;
  to_location: string;
  distance_km: string;
  drive_time: string;
  stay_name: string;
  stay_location: string;
  notes: string;
  travel_budget: string;
  stay_budget: string;
  restaurant_budget: string;
  activities_budget: string;
  other_budget: string;
  sightseeing: DayListItem[];
  restaurants: DayListItem[];
  foods: DayListItem[];
};

export type DayItineraryFormValues = Pick<
  DayFormValues,
  | "date"
  | "from_location"
  | "to_location"
  | "distance_km"
  | "drive_time"
  | "stay_name"
  | "stay_location"
  | "notes"
  | "sightseeing"
  | "restaurants"
  | "foods"
>;

export type DayBudgetFormValues = Pick<
  DayFormValues,
  | "travel_budget"
  | "stay_budget"
  | "restaurant_budget"
  | "activities_budget"
  | "other_budget"
>;

export const BUDGET_FIELD_KEYS = [
  "travel_budget",
  "stay_budget",
  "restaurant_budget",
  "activities_budget",
  "other_budget",
] as const satisfies readonly (keyof DayBudgetFormValues)[];

export const BUDGET_FIELD_LABELS: Record<keyof DayBudgetFormValues, string> = {
  travel_budget: "Travel",
  stay_budget: "Stay",
  restaurant_budget: "Restaurants",
  activities_budget: "Activities",
  other_budget: "Other",
};

export function toDayFormValues(day: ItineraryDay): DayFormValues {
  return {
    date: day.date,
    from_location: day.from_location ?? "",
    to_location: day.to_location ?? "",
    distance_km: day.distance_km != null ? String(day.distance_km) : "",
    drive_time: day.drive_time ?? "",
    stay_name: day.stay_name ?? "",
    stay_location: day.stay_location ?? "",
    notes: day.notes ?? "",
    travel_budget: day.travel_budget != null ? String(day.travel_budget) : "",
    stay_budget: day.stay_budget != null ? String(day.stay_budget) : "",
    restaurant_budget:
      day.restaurant_budget != null ? String(day.restaurant_budget) : "",
    activities_budget:
      day.activities_budget != null ? String(day.activities_budget) : "",
    other_budget: day.other_budget != null ? String(day.other_budget) : "",
    sightseeing: day.sightseeing ?? [],
    restaurants: day.restaurants ?? [],
    foods: day.foods ?? [],
  };
}

export function toItineraryFormValues(day: ItineraryDay): DayItineraryFormValues {
  const all = toDayFormValues(day);
  return {
    date: all.date,
    from_location: all.from_location,
    to_location: all.to_location,
    distance_km: all.distance_km,
    drive_time: all.drive_time,
    stay_name: all.stay_name,
    stay_location: all.stay_location,
    notes: all.notes,
    sightseeing: all.sightseeing,
    restaurants: all.restaurants,
    foods: all.foods,
  };
}

export function toBudgetFormValues(day: ItineraryDay): DayBudgetFormValues {
  const all = toDayFormValues(day);
  return {
    travel_budget: all.travel_budget,
    stay_budget: all.stay_budget,
    restaurant_budget: all.restaurant_budget,
    activities_budget: all.activities_budget,
    other_budget: all.other_budget,
  };
}

export function mergeDayFormValues(
  base: DayFormValues,
  patch: Partial<DayFormValues>,
): DayFormValues {
  return { ...base, ...patch };
}

export function parseBudget(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function budgetTotalFromForm(values: DayBudgetFormValues): number {
  return BUDGET_FIELD_KEYS.reduce(
    (sum, key) => sum + (parseBudget(values[key]) ?? 0),
    0,
  );
}

export function formToDayPatch(values: DayFormValues) {
  return {
    date: values.date,
    from_location: values.from_location.trim() || null,
    to_location: values.to_location.trim() || null,
    distance_km: values.distance_km ? Number(values.distance_km) : null,
    drive_time: values.drive_time.trim() || null,
    stay_name: values.stay_name.trim() || null,
    stay_location: values.stay_location.trim() || null,
    notes: values.notes.trim() || null,
    travel_budget: parseBudget(values.travel_budget),
    stay_budget: parseBudget(values.stay_budget),
    restaurant_budget: parseBudget(values.restaurant_budget),
    activities_budget: parseBudget(values.activities_budget),
    other_budget: parseBudget(values.other_budget),
    sightseeing: values.sightseeing,
    restaurants: values.restaurants,
    foods: values.foods,
  };
}
