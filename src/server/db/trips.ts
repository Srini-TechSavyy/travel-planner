import { nowIso } from "./client";
import {
  insertItineraryDayFull,
  insertItineraryDays,
  listDaysForTrip,
} from "./itinerary-days";
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
  created_at: string;
  updated_at: string;
};

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

export async function createTrip(
  db: D1Database,
  input: {
    userId: string;
    name: string;
    start_date: string;
    end_date: string;
    adults: number;
    children: number;
    starting_location?: string | null;
    destination?: string | null;
  },
): Promise<Trip> {
  const id = crypto.randomUUID();
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO trips (
        id, user_id, name, start_date, end_date, adults, children,
        starting_location, destination, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.userId,
      input.name,
      input.start_date,
      input.end_date,
      input.adults,
      input.children,
      input.starting_location ?? null,
      input.destination ?? null,
      ts,
      ts,
    )
    .run();

  const dayDates = datesInclusive(input.start_date, input.end_date);
  await insertItineraryDays(
    db,
    id,
    dayDates.map((date, index) => ({
      day_number: index + 1,
      date,
    })),
  );

  const trip = await getTripForUser(db, id, input.userId);
  if (!trip) throw new Error("Failed to create trip");
  return trip;
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
    starting_location?: string | null;
    destination?: string | null;
  },
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

  await db
    .prepare(
      `UPDATE trips SET
        name = ?, start_date = ?, end_date = ?, adults = ?, children = ?,
        starting_location = ?, destination = ?, updated_at = ?
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
): Promise<{ trip: Trip; days: ItineraryDay[] }> {
  const id = crypto.randomUUID();
  const ts = nowIso();
  await db
    .prepare(
      `INSERT INTO trips (
        id, user_id, name, start_date, end_date, adults, children,
        starting_location, destination, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      payload.name,
      payload.start_date,
      payload.end_date,
      payload.adults,
      payload.children,
      payload.starting_location ?? null,
      payload.destination ?? null,
      ts,
      ts,
    )
    .run();

  for (const day of payload.days) {
    await insertItineraryDayFull(db, id, {
      day_number: day.day_number,
      date: day.date,
      from_location: day.from_location ?? null,
      to_location: day.to_location ?? null,
      distance_km: day.distance_km ?? null,
      drive_time: day.drive_time ?? null,
      stay_location: day.stay_location ?? null,
      notes: day.notes ?? null,
      travel_budget: day.travel_budget ?? null,
      stay_budget: day.stay_budget ?? null,
      restaurant_budget: day.restaurant_budget ?? null,
      activities_budget: day.activities_budget ?? null,
      other_budget: day.other_budget ?? null,
      sightseeing: day.sightseeing,
      restaurants: day.restaurants,
      foods: day.foods,
    });
  }

  const trip = await getTripForUser(db, id, userId);
  if (!trip) throw new Error("Failed to import trip");
  const days = await listDaysForTrip(db, id);
  return { trip, days };
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
