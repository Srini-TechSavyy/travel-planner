import type { DraftTripBundle, ItineraryDay, Trip, TripExpense } from "../../shared/types";
import { summarizeTripExpenses } from "../../shared/expenses";
import type { ExpenseCategory } from "../../shared/expenses";
import { datesInclusive } from "./dates";

const STORAGE_KEY = "tripmate_drafts_v1";

export const DRAFT_ID_PREFIX = "draft_";

export function isDraftTripId(id: string): boolean {
  return id.startsWith(DRAFT_ID_PREFIX);
}

type StoredDraft = DraftTripBundle;

function normalizeDraft(bundle: StoredDraft): StoredDraft {
  return { ...bundle, expenses: bundle.expenses ?? [] };
}

function readAll(): StoredDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDraft[];
    return Array.isArray(parsed) ? parsed.map(normalizeDraft) : [];
  } catch {
    return [];
  }
}

function writeAll(drafts: StoredDraft[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  window.dispatchEvent(new Event("tripmate-drafts-updated"));
}

function emptyDay(
  tripId: string,
  dayNumber: number,
  date: string,
): ItineraryDay {
  const ts = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    trip_id: tripId,
    day_number: dayNumber,
    date,
    from_location: null,
    to_location: null,
    distance_km: null,
    drive_time: null,
    stay_name: null,
    stay_location: null,
    stay_location_place_id: null,
    stay_location_lat: null,
    stay_location_lng: null,
    stay_location_country: null,
    stay_location_admin_area: null,
    stay_location_photo_name: null,
    notes: null,
    travel_budget: null,
    stay_budget: null,
    restaurant_budget: null,
    activities_budget: null,
    other_budget: null,
    sightseeing: [],
    restaurants: [],
    foods: [],
    created_at: ts,
    updated_at: ts,
  };
}

export function listDraftTrips(): StoredDraft[] {
  return readAll();
}

export function getDraftTrip(tripId: string): StoredDraft | null {
  return readAll().find((d) => d.trip.id === tripId) ?? null;
}

export function saveDraftBundle(bundle: StoredDraft): void {
  const drafts = readAll();
  const idx = drafts.findIndex((d) => d.trip.id === bundle.trip.id);
  if (idx >= 0) drafts[idx] = bundle;
  else drafts.push(bundle);
  writeAll(drafts);
}

export function deleteDraftTrip(tripId: string): void {
  writeAll(readAll().filter((d) => d.trip.id !== tripId));
}

type TripLocationDbFields = Pick<
  Trip,
  | "starting_location"
  | "destination"
  | "starting_location_place_id"
  | "starting_location_lat"
  | "starting_location_lng"
  | "starting_location_country"
  | "starting_location_admin_area"
  | "starting_location_photo_name"
  | "destination_place_id"
  | "destination_lat"
  | "destination_lng"
  | "destination_country"
  | "destination_admin_area"
  | "destination_photo_name"
>;

export function createDraftTrip(
  input: {
    name: string;
    start_date: string;
    end_date: string;
    adults: number;
    children: number;
  } & Partial<TripLocationDbFields>,
): StoredDraft {
  const id = `${DRAFT_ID_PREFIX}${crypto.randomUUID()}`;
  const ts = new Date().toISOString();
  const trip: Trip = {
    id,
    user_id: "",
    name: input.name,
    start_date: input.start_date,
    end_date: input.end_date,
    adults: input.adults,
    children: input.children,
    starting_location: input.starting_location?.trim() || null,
    destination: input.destination?.trim() || null,
    starting_location_place_id: input.starting_location_place_id ?? null,
    starting_location_lat: input.starting_location_lat ?? null,
    starting_location_lng: input.starting_location_lng ?? null,
    starting_location_country: input.starting_location_country ?? null,
    starting_location_admin_area: input.starting_location_admin_area ?? null,
    starting_location_photo_name: input.starting_location_photo_name ?? null,
    destination_place_id: input.destination_place_id ?? null,
    destination_lat: input.destination_lat ?? null,
    destination_lng: input.destination_lng ?? null,
    destination_country: input.destination_country ?? null,
    destination_admin_area: input.destination_admin_area ?? null,
    destination_photo_name: input.destination_photo_name ?? null,
    created_at: ts,
    updated_at: ts,
  };
  const dayDates = datesInclusive(input.start_date, input.end_date);
  const days = dayDates.map((date, i) => emptyDay(id, i + 1, date));
  const bundle: StoredDraft = {
    trip,
    days,
    expenses: [],
    server_trip_id: crypto.randomUUID(),
  };
  saveDraftBundle(bundle);
  return bundle;
}

function ensureServerTripId(bundle: StoredDraft): string {
  if (bundle.server_trip_id) return bundle.server_trip_id;
  bundle.server_trip_id = crypto.randomUUID();
  saveDraftBundle(bundle);
  return bundle.server_trip_id;
}

export function updateDraftTripMeta(
  tripId: string,
  fields: Partial<
    Pick<
      Trip,
      | "name"
      | "start_date"
      | "end_date"
      | "adults"
      | "children"
      | "starting_location"
      | "destination"
      | "starting_location_place_id"
      | "starting_location_lat"
      | "starting_location_lng"
      | "starting_location_country"
      | "starting_location_admin_area"
      | "starting_location_photo_name"
      | "destination_place_id"
      | "destination_lat"
      | "destination_lng"
      | "destination_country"
      | "destination_admin_area"
      | "destination_photo_name"
    >
  >,
): StoredDraft | null {
  const bundle = getDraftTrip(tripId);
  if (!bundle) return null;
  bundle.trip = {
    ...bundle.trip,
    ...fields,
    updated_at: new Date().toISOString(),
  };
  saveDraftBundle(bundle);
  return bundle;
}

export function updateDraftDay(
  tripId: string,
  dayId: string,
  updater: (day: ItineraryDay) => ItineraryDay,
): StoredDraft | null {
  const bundle = getDraftTrip(tripId);
  if (!bundle) return null;
  bundle.days = bundle.days.map((d) =>
    d.id === dayId
      ? { ...updater(d), updated_at: new Date().toISOString() }
      : d,
  );
  bundle.trip.updated_at = new Date().toISOString();
  saveDraftBundle(bundle);
  return bundle;
}

export function appendDraftDay(tripId: string, date: string): StoredDraft | null {
  const bundle = getDraftTrip(tripId);
  if (!bundle) return null;
  const nextNum =
    bundle.days.reduce((max, d) => Math.max(max, d.day_number), 0) + 1;
  bundle.days.push(emptyDay(tripId, nextNum, date));
  bundle.trip.updated_at = new Date().toISOString();
  saveDraftBundle(bundle);
  return bundle;
}

export type DraftExpenseInput = {
  category: ExpenseCategory;
  expense_type: string;
  amount: number;
  day_id?: string | null;
  notes?: string | null;
};

function recomputeDraftExpenses(bundle: StoredDraft): StoredDraft {
  bundle.expenses = bundle.expenses ?? [];
  return bundle;
}

export function addDraftExpense(
  tripId: string,
  input: DraftExpenseInput,
): StoredDraft | null {
  const bundle = getDraftTrip(tripId);
  if (!bundle) return null;
  const ts = new Date().toISOString();
  const expense: TripExpense = {
    id: crypto.randomUUID(),
    trip_id: tripId,
    day_id: input.day_id ?? null,
    category: input.category,
    expense_type: input.expense_type,
    amount: input.amount,
    notes: input.notes ?? null,
    created_at: ts,
    updated_at: ts,
  };
  recomputeDraftExpenses(bundle);
  bundle.expenses!.push(expense);
  bundle.trip.updated_at = ts;
  saveDraftBundle(bundle);
  return bundle;
}

export function updateDraftExpense(
  tripId: string,
  expenseId: string,
  input: Partial<DraftExpenseInput>,
): StoredDraft | null {
  const bundle = getDraftTrip(tripId);
  if (!bundle || !bundle.expenses) return null;
  const idx = bundle.expenses.findIndex((e) => e.id === expenseId);
  if (idx < 0) return null;
  const ts = new Date().toISOString();
  const prev = bundle.expenses[idx]!;
  bundle.expenses[idx] = {
    ...prev,
    category: input.category ?? prev.category,
    expense_type: input.expense_type ?? prev.expense_type,
    amount: input.amount ?? prev.amount,
    day_id: input.day_id !== undefined ? input.day_id : prev.day_id,
    notes: input.notes !== undefined ? input.notes : prev.notes,
    updated_at: ts,
  };
  bundle.trip.updated_at = ts;
  saveDraftBundle(bundle);
  return bundle;
}

export function deleteDraftExpense(
  tripId: string,
  expenseId: string,
): StoredDraft | null {
  const bundle = getDraftTrip(tripId);
  if (!bundle || !bundle.expenses) return null;
  const next = bundle.expenses.filter((e) => e.id !== expenseId);
  if (next.length === bundle.expenses.length) return null;
  bundle.expenses = next;
  bundle.trip.updated_at = new Date().toISOString();
  saveDraftBundle(bundle);
  return bundle;
}

export function draftExpenseSummary(tripId: string) {
  const bundle = getDraftTrip(tripId);
  if (!bundle?.expenses) return summarizeTripExpenses([]);
  return summarizeTripExpenses(bundle.expenses);
}

export function draftToImportPayload(bundle: StoredDraft) {
  const tripId = ensureServerTripId(bundle);
  return {
    id: tripId,
    name: bundle.trip.name,
    start_date: bundle.trip.start_date,
    end_date: bundle.trip.end_date,
    adults: bundle.trip.adults,
    children: bundle.trip.children,
    starting_location: bundle.trip.starting_location,
    destination: bundle.trip.destination,
    starting_location_place_id: bundle.trip.starting_location_place_id,
    starting_location_lat: bundle.trip.starting_location_lat,
    starting_location_lng: bundle.trip.starting_location_lng,
    starting_location_country: bundle.trip.starting_location_country,
    starting_location_admin_area: bundle.trip.starting_location_admin_area,
    starting_location_photo_name: bundle.trip.starting_location_photo_name,
    destination_place_id: bundle.trip.destination_place_id,
    destination_lat: bundle.trip.destination_lat,
    destination_lng: bundle.trip.destination_lng,
    destination_country: bundle.trip.destination_country,
    destination_admin_area: bundle.trip.destination_admin_area,
    destination_photo_name: bundle.trip.destination_photo_name,
    days: bundle.days.map((d) => ({
      id: d.id,
      day_number: d.day_number,
      date: d.date,
      from_location: d.from_location,
      to_location: d.to_location,
      distance_km: d.distance_km,
      drive_time: d.drive_time,
      stay_name: d.stay_name,
      stay_location: d.stay_location,
      stay_location_place_id: d.stay_location_place_id,
      stay_location_lat: d.stay_location_lat,
      stay_location_lng: d.stay_location_lng,
      stay_location_country: d.stay_location_country,
      stay_location_admin_area: d.stay_location_admin_area,
      stay_location_photo_name: d.stay_location_photo_name,
      notes: d.notes,
      travel_budget: d.travel_budget,
      stay_budget: d.stay_budget,
      restaurant_budget: d.restaurant_budget,
      activities_budget: d.activities_budget,
      other_budget: d.other_budget,
      sightseeing: d.sightseeing.map((s, i) => ({
        id: s.id,
        name: s.name,
        sort_order: s.sort_order ?? i,
      })),
      restaurants: d.restaurants.map((s, i) => ({
        id: s.id,
        name: s.name,
        sort_order: s.sort_order ?? i,
      })),
      foods: d.foods.map((s, i) => ({
        id: s.id,
        name: s.name,
        sort_order: s.sort_order ?? i,
      })),
    })),
    expenses: (bundle.expenses ?? []).map((e) => ({
      id: e.id,
      day_id: e.day_id,
      category: e.category,
      expense_type: e.expense_type,
      amount: e.amount,
      notes: e.notes,
    })),
  };
}
