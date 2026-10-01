import { nowIso } from "./client";
import {
  insertDayLists,
  listItemsForDay,
  listItemsForTripDays,
  replaceDayLists,
} from "./trip-day-lists";
import type { ItineraryDay } from "../../shared/types";

export type ItineraryDayRow = {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  from_location: string | null;
  to_location: string | null;
  distance_km: number | null;
  drive_time: string | null;
  stay_location: string | null;
  notes: string | null;
  travel_budget: number | null;
  stay_budget: number | null;
  restaurant_budget: number | null;
  activities_budget: number | null;
  other_budget: number | null;
  created_at: string;
  updated_at: string;
};

function attachLists(
  row: ItineraryDayRow,
  lists: {
    sightseeing: Map<string, { id: string; name: string; sort_order: number }[]>;
    restaurants: Map<string, { id: string; name: string; sort_order: number }[]>;
    foods: Map<string, { id: string; name: string; sort_order: number }[]>;
  },
): ItineraryDay {
  return {
    ...row,
    sightseeing: lists.sightseeing.get(row.id) ?? [],
    restaurants: lists.restaurants.get(row.id) ?? [],
    foods: lists.foods.get(row.id) ?? [],
  };
}

export async function listDaysForTrip(
  db: D1Database,
  tripId: string,
): Promise<ItineraryDay[]> {
  const result = await db
    .prepare(
      `SELECT * FROM itinerary_days WHERE trip_id = ? ORDER BY day_number ASC`,
    )
    .bind(tripId)
    .all<ItineraryDayRow>();
  const rows = result.results ?? [];
  const ids = rows.map((r) => r.id);
  const lists = await listItemsForTripDays(db, ids);
  return rows.map((row) => attachLists(row, lists));
}

export async function insertItineraryDays(
  db: D1Database,
  tripId: string,
  days: { day_number: number; date: string }[],
): Promise<void> {
  const ts = nowIso();
  for (const day of days) {
    await db
      .prepare(
        `INSERT INTO itinerary_days (
          id, trip_id, day_number, date,
          from_location, to_location, distance_km, drive_time, stay_location, notes,
          travel_budget, stay_budget, restaurant_budget, activities_budget, other_budget,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      )
      .bind(crypto.randomUUID(), tripId, day.day_number, day.date, ts, ts)
      .run();
  }
}

export async function insertItineraryDayFull(
  db: D1Database,
  tripId: string,
  day: {
    id?: string;
    day_number: number;
    date: string;
    from_location?: string | null;
    to_location?: string | null;
    distance_km?: number | null;
    drive_time?: string | null;
    stay_location?: string | null;
    notes?: string | null;
    travel_budget?: number | null;
    stay_budget?: number | null;
    restaurant_budget?: number | null;
    activities_budget?: number | null;
    other_budget?: number | null;
    sightseeing?: { name: string; sort_order?: number }[];
    restaurants?: { name: string; sort_order?: number }[];
    foods?: { name: string; sort_order?: number }[];
  },
): Promise<ItineraryDay> {
  const id = day.id ?? crypto.randomUUID();
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO itinerary_days (
        id, trip_id, day_number, date,
        from_location, to_location, distance_km, drive_time, stay_location, notes,
        travel_budget, stay_budget, restaurant_budget, activities_budget, other_budget,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      tripId,
      day.day_number,
      day.date,
      day.from_location ?? null,
      day.to_location ?? null,
      day.distance_km ?? null,
      day.drive_time ?? null,
      day.stay_location ?? null,
      day.notes ?? null,
      day.travel_budget ?? null,
      day.stay_budget ?? null,
      day.restaurant_budget ?? null,
      day.activities_budget ?? null,
      day.other_budget ?? null,
      ts,
      ts,
    )
    .run();

  await insertDayLists(db, id, {
    sightseeing: day.sightseeing,
    restaurants: day.restaurants,
    foods: day.foods,
  });

  const loaded = await getDayForTrip(db, tripId, id);
  if (!loaded) throw new Error("Failed to insert day");
  return loaded;
}

export async function getDayForTrip(
  db: D1Database,
  tripId: string,
  dayId: string,
): Promise<ItineraryDay | null> {
  const row = await db
    .prepare(`SELECT * FROM itinerary_days WHERE id = ? AND trip_id = ?`)
    .bind(dayId, tripId)
    .first<ItineraryDayRow>();
  if (!row) return null;

  const [sightseeing, restaurants, foods] = await Promise.all([
    listItemsForDay(db, dayId, "sightseeing"),
    listItemsForDay(db, dayId, "restaurants"),
    listItemsForDay(db, dayId, "foods"),
  ]);

  return {
    ...row,
    sightseeing,
    restaurants,
    foods,
  };
}

export type UpdateDayFields = {
  date: string;
  from_location: string | null;
  to_location: string | null;
  distance_km: number | null;
  drive_time: string | null;
  stay_location: string | null;
  notes: string | null;
  travel_budget: number | null;
  stay_budget: number | null;
  restaurant_budget: number | null;
  activities_budget: number | null;
  other_budget: number | null;
  sightseeing?: { name: string; sort_order?: number }[];
  restaurants?: { name: string; sort_order?: number }[];
  foods?: { name: string; sort_order?: number }[];
};

export async function updateItineraryDay(
  db: D1Database,
  tripId: string,
  dayId: string,
  fields: UpdateDayFields,
): Promise<ItineraryDay | null> {
  const ts = nowIso();
  const result = await db
    .prepare(
      `UPDATE itinerary_days SET
        date = ?,
        from_location = ?,
        to_location = ?,
        distance_km = ?,
        drive_time = ?,
        stay_location = ?,
        notes = ?,
        travel_budget = ?,
        stay_budget = ?,
        restaurant_budget = ?,
        activities_budget = ?,
        other_budget = ?,
        updated_at = ?
      WHERE id = ? AND trip_id = ?`,
    )
    .bind(
      fields.date,
      fields.from_location,
      fields.to_location,
      fields.distance_km,
      fields.drive_time,
      fields.stay_location,
      fields.notes,
      fields.travel_budget,
      fields.stay_budget,
      fields.restaurant_budget,
      fields.activities_budget,
      fields.other_budget,
      ts,
      dayId,
      tripId,
    )
    .run();

  if ((result.meta.changes ?? 0) === 0) return null;

  if (
    fields.sightseeing !== undefined ||
    fields.restaurants !== undefined ||
    fields.foods !== undefined
  ) {
    await replaceDayLists(db, dayId, {
      sightseeing: fields.sightseeing,
      restaurants: fields.restaurants,
      foods: fields.foods,
    });
  }

  return getDayForTrip(db, tripId, dayId);
}

export async function getMaxDayNumber(
  db: D1Database,
  tripId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT MAX(day_number) as max_day FROM itinerary_days WHERE trip_id = ?`,
    )
    .bind(tripId)
    .first<{ max_day: number | null }>();
  return row?.max_day ?? 0;
}

export async function appendItineraryDay(
  db: D1Database,
  tripId: string,
  date: string,
): Promise<ItineraryDay> {
  const next = (await getMaxDayNumber(db, tripId)) + 1;
  const id = crypto.randomUUID();
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO itinerary_days (
        id, trip_id, day_number, date,
        from_location, to_location, distance_km, drive_time, stay_location, notes,
        travel_budget, stay_budget, restaurant_budget, activities_budget, other_budget,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
    )
    .bind(id, tripId, next, date, ts, ts)
    .run();

  const day = await getDayForTrip(db, tripId, id);
  if (!day) throw new Error("Failed to add day");
  return day;
}
