import type { DraftTripBundle, ItineraryDay, Trip } from "../../shared/types";
import { datesInclusive } from "./dates";

const STORAGE_KEY = "tripmate_drafts_v1";

export const DRAFT_ID_PREFIX = "draft_";

export function isDraftTripId(id: string): boolean {
  return id.startsWith(DRAFT_ID_PREFIX);
}

type StoredDraft = DraftTripBundle;

function readAll(): StoredDraft[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDraft[];
    return Array.isArray(parsed) ? parsed : [];
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
    stay_location: null,
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

export function createDraftTrip(input: {
  name: string;
  start_date: string;
  end_date: string;
  adults: number;
  children: number;
  starting_location?: string;
  destination?: string;
}): StoredDraft {
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
    created_at: ts,
    updated_at: ts,
  };
  const dayDates = datesInclusive(input.start_date, input.end_date);
  const days = dayDates.map((date, i) => emptyDay(id, i + 1, date));
  const bundle = { trip, days };
  saveDraftBundle(bundle);
  return bundle;
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

export function draftToImportPayload(bundle: StoredDraft) {
  return {
    name: bundle.trip.name,
    start_date: bundle.trip.start_date,
    end_date: bundle.trip.end_date,
    adults: bundle.trip.adults,
    children: bundle.trip.children,
    starting_location: bundle.trip.starting_location,
    destination: bundle.trip.destination,
    days: bundle.days.map((d) => ({
      day_number: d.day_number,
      date: d.date,
      from_location: d.from_location,
      to_location: d.to_location,
      distance_km: d.distance_km,
      drive_time: d.drive_time,
      stay_location: d.stay_location,
      notes: d.notes,
      travel_budget: d.travel_budget,
      stay_budget: d.stay_budget,
      restaurant_budget: d.restaurant_budget,
      activities_budget: d.activities_budget,
      other_budget: d.other_budget,
      sightseeing: d.sightseeing.map((s, i) => ({
        name: s.name,
        sort_order: s.sort_order ?? i,
      })),
      restaurants: d.restaurants.map((s, i) => ({
        name: s.name,
        sort_order: s.sort_order ?? i,
      })),
      foods: d.foods.map((s, i) => ({
        name: s.name,
        sort_order: s.sort_order ?? i,
      })),
    })),
  };
}
