import { nowIso } from "./client";
import {
  buildItineraryDayInsertStatements,
  insertItineraryDays,
  listDaysForTrip,
} from "./itinerary-days";
import { buildDayListStatements } from "./trip-day-lists";
import type { ItineraryDay, Trip, TripListItem } from "../../shared/types";
import type { z } from "zod";
import type { importTripSchema } from "../validation";

export type TripRow = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  adults: number;
  children: number;
  starting_location: string | null;
  destination: string | null;
  starting_location_place_id: string | null;
  starting_location_lat: number | null;
  starting_location_lng: number | null;
  starting_location_country: string | null;
  starting_location_admin_area: string | null;
  destination_place_id: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_country: string | null;
  destination_admin_area: string | null;
  created_at: string;
  updated_at: string;
};

type TripLocationInput = {
  starting_location?: string | null;
  destination?: string | null;
  starting_location_place_id?: string | null;
  starting_location_lat?: number | null;
  starting_location_lng?: number | null;
  starting_location_country?: string | null;
  starting_location_admin_area?: string | null;
  destination_place_id?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  destination_country?: string | null;
  destination_admin_area?: string | null;
};

function tripLocationInsertBinds(input: TripLocationInput) {
  return [
    input.starting_location ?? null,
    input.destination ?? null,
    input.starting_location_place_id ?? null,
    input.starting_location_lat ?? null,
    input.starting_location_lng ?? null,
    input.starting_location_country ?? null,
    input.starting_location_admin_area ?? null,
    input.destination_place_id ?? null,
    input.destination_lat ?? null,
    input.destination_lng ?? null,
    input.destination_country ?? null,
    input.destination_admin_area ?? null,
  ];
}

type ImportPayload = z.infer<typeof importTripSchema>;

export function datesInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (current > end) return dates;
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function rowToTrip(row: TripRow): Trip {
  return row;
}

export async function listTripsForUser(
  db: D1Database,
  userId: string,
): Promise<TripListItem[]> {
  const result = await db
    .prepare(
      `SELECT t.*,
        (
          SELECT COALESCE(SUM(
            COALESCE(d.travel_budget, 0) + COALESCE(d.stay_budget, 0) +
            COALESCE(d.restaurant_budget, 0) + COALESCE(d.activities_budget, 0) +
            COALESCE(d.other_budget, 0)
          ), 0)
          FROM itinerary_days d WHERE d.trip_id = t.id
        ) AS budget_sum
       FROM trips t
       WHERE t.user_id = ?
       ORDER BY t.start_date DESC`,
    )
    .bind(userId)
    .all<TripRow & { budget_sum: number }>();

  return (result.results ?? []).map((row) => {
    const { budget_sum, ...trip } = row;
    const total = budget_sum > 0 ? budget_sum : null;
    return { ...rowToTrip(trip), budget_total: total };
  });
}

export async function getTripForUser(
  db: D1Database,
  tripId: string,
  userId: string,
): Promise<Trip | null> {
  const row = await db
    .prepare(`SELECT * FROM trips WHERE id = ? AND user_id = ?`)
    .bind(tripId, userId)
    .first<TripRow>();
  return row ? rowToTrip(row) : null;
}

function daySpecsFromRange(startDate: string, endDate: string) {
  return datesInclusive(startDate, endDate).map((date, index) => ({
    day_number: index + 1,
    date,
  }));
}

export async function createTrip(
  db: D1Database,
  input: {
    id?: string;
    userId: string;
    name: string;
    start_date: string;
    end_date: string;
    adults: number;
    children: number;
  } & TripLocationInput,
): Promise<{ trip: Trip; created: boolean }> {
  const id = input.id ?? crypto.randomUUID();
  const existing = await getTripForUser(db, id, input.userId);
  if (existing) {
    const existingDays = await listDaysForTrip(db, id);
    if (existingDays.length > 0) {
      return { trip: existing, created: false };
    }
    const specs = daySpecsFromRange(existing.start_date, existing.end_date);
    try {
      await insertItineraryDays(db, id, specs);
    } catch (err) {
      console.error("createTrip: failed to backfill itinerary days", {
        tripId: id,
        userId: input.userId,
        err,
      });
      throw err;
    }
    const trip = await getTripForUser(db, id, input.userId);
    if (!trip) throw new Error("Failed to create trip");
    return { trip, created: false };
  }

  const ts = nowIso();
  const specs = daySpecsFromRange(input.start_date, input.end_date);
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO trips (
        id, user_id, name, start_date, end_date, adults, children,
        starting_location, destination,
        starting_location_place_id, starting_location_lat, starting_location_lng,
        starting_location_country, starting_location_admin_area,
        destination_place_id, destination_lat, destination_lng,
        destination_country, destination_admin_area,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.userId,
        input.name,
        input.start_date,
        input.end_date,
        input.adults,
        input.children,
        ...tripLocationInsertBinds(input),
        ts,
        ts,
      ),
    ...buildItineraryDayInsertStatements(db, id, specs, ts),
  ];

  try {
    await db.batch(statements);
  } catch (err) {
    console.error("createTrip: D1 batch failed", {
      tripId: id,
      userId: input.userId,
      dayCount: specs.length,
      err,
    });
    const again = await getTripForUser(db, id, input.userId);
    if (again) {
      const days = await listDaysForTrip(db, id);
      if (days.length > 0) return { trip: again, created: false };
      await deleteTripForUser(db, id, input.userId);
    }
    throw err;
  }

  const trip = await getTripForUser(db, id, input.userId);
  if (!trip) throw new Error("Failed to create trip");
  return { trip, created: true };
}

export async function updateTripForUser(
  db: D1Database,
  tripId: string,
  userId: string,
  fields: {
    name?: string;
    start_date?: string;
    end_date?: string;
    adults?: number;
    children?: number;
  } & Partial<TripLocationInput>,
): Promise<Trip | null> {
  const existing = await getTripForUser(db, tripId, userId);
  if (!existing) return null;

  const ts = nowIso();
  const name = fields.name ?? existing.name;
  const start_date = fields.start_date ?? existing.start_date;
  const end_date = fields.end_date ?? existing.end_date;
  const adults = fields.adults ?? existing.adults;
  const children = fields.children ?? existing.children;
  const starting_location =
    fields.starting_location !== undefined
      ? fields.starting_location
      : existing.starting_location;
  const destination =
    fields.destination !== undefined
      ? fields.destination
      : existing.destination;
  const starting_location_place_id =
    fields.starting_location_place_id !== undefined
      ? fields.starting_location_place_id
      : existing.starting_location_place_id;
  const starting_location_lat =
    fields.starting_location_lat !== undefined
      ? fields.starting_location_lat
      : existing.starting_location_lat;
  const starting_location_lng =
    fields.starting_location_lng !== undefined
      ? fields.starting_location_lng
      : existing.starting_location_lng;
  const starting_location_country =
    fields.starting_location_country !== undefined
      ? fields.starting_location_country
      : existing.starting_location_country;
  const starting_location_admin_area =
    fields.starting_location_admin_area !== undefined
      ? fields.starting_location_admin_area
      : existing.starting_location_admin_area;
  const destination_place_id =
    fields.destination_place_id !== undefined
      ? fields.destination_place_id
      : existing.destination_place_id;
  const destination_lat =
    fields.destination_lat !== undefined
      ? fields.destination_lat
      : existing.destination_lat;
  const destination_lng =
    fields.destination_lng !== undefined
      ? fields.destination_lng
      : existing.destination_lng;
  const destination_country =
    fields.destination_country !== undefined
      ? fields.destination_country
      : existing.destination_country;
  const destination_admin_area =
    fields.destination_admin_area !== undefined
      ? fields.destination_admin_area
      : existing.destination_admin_area;

  await db
    .prepare(
      `UPDATE trips SET
        name = ?, start_date = ?, end_date = ?, adults = ?, children = ?,
        starting_location = ?, destination = ?,
        starting_location_place_id = ?, starting_location_lat = ?, starting_location_lng = ?,
        starting_location_country = ?, starting_location_admin_area = ?,
        destination_place_id = ?, destination_lat = ?, destination_lng = ?,
        destination_country = ?, destination_admin_area = ?,
        updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .bind(
      name,
      start_date,
      end_date,
      adults,
      children,
      starting_location,
      destination,
      starting_location_place_id,
      starting_location_lat,
      starting_location_lng,
      starting_location_country,
      starting_location_admin_area,
      destination_place_id,
      destination_lat,
      destination_lng,
      destination_country,
      destination_admin_area,
      ts,
      tripId,
      userId,
    )
    .run();

  return getTripForUser(db, tripId, userId);
}

export async function importTripForUser(
  db: D1Database,
  userId: string,
  payload: ImportPayload,
): Promise<{ trip: Trip; days: ItineraryDay[]; created: boolean }> {
  const id = payload.id ?? crypto.randomUUID();
  const existing = await getTripForUser(db, id, userId);
  if (existing) {
    const days = await listDaysForTrip(db, id);
    return { trip: existing, days, created: false };
  }

  const ts = nowIso();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO trips (
        id, user_id, name, start_date, end_date, adults, children,
        starting_location, destination,
        starting_location_place_id, starting_location_lat, starting_location_lng,
        starting_location_country, starting_location_admin_area,
        destination_place_id, destination_lat, destination_lng,
        destination_country, destination_admin_area,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        userId,
        payload.name,
        payload.start_date,
        payload.end_date,
        payload.adults,
        payload.children,
        ...tripLocationInsertBinds(payload),
        ts,
        ts,
      ),
  ];

  for (const day of payload.days) {
    const dayId = day.id ?? crypto.randomUUID();
    statements.push(
      db
        .prepare(
          `INSERT INTO itinerary_days (
          id, trip_id, day_number, date,
          from_location, to_location, distance_km, drive_time, stay_name, stay_location, notes,
          travel_budget, stay_budget, restaurant_budget, activities_budget, other_budget,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          dayId,
          id,
          day.day_number,
          day.date,
          day.from_location ?? null,
          day.to_location ?? null,
          day.distance_km ?? null,
          day.drive_time ?? null,
          day.stay_name ?? null,
          day.stay_location ?? null,
          day.notes ?? null,
          day.travel_budget ?? null,
          day.stay_budget ?? null,
          day.restaurant_budget ?? null,
          day.activities_budget ?? null,
          day.other_budget ?? null,
          ts,
          ts,
        ),
    );
    statements.push(
      ...buildDayListStatements(db, dayId, {
        sightseeing: day.sightseeing,
        restaurants: day.restaurants,
        foods: day.foods,
      }),
    );
  }

  try {
    await db.batch(statements);
  } catch {
    const again = await getTripForUser(db, id, userId);
    if (again) {
      const days = await listDaysForTrip(db, id);
      return { trip: again, days, created: false };
    }
    throw new Error("Failed to import trip");
  }

  const trip = await getTripForUser(db, id, userId);
  if (!trip) throw new Error("Failed to import trip");
  const days = await listDaysForTrip(db, id);
  return { trip, days, created: true };
}

export async function deleteTripForUser(
  db: D1Database,
  tripId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM trips WHERE id = ? AND user_id = ?`)
    .bind(tripId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
