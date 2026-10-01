import { Hono } from "hono";
import type { Env } from "../../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import {
  appendItineraryDay,
  updateItineraryDay,
} from "../db/itinerary-days";
import { getTripForUser } from "../db/trips";
import { addDaySchema, updateDaySchema } from "../validation";

export const itineraryDayRoutes = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

itineraryDayRoutes.use("*", requireAuth);

async function assertTripOwned(
  c: { env: Env; get: (key: "user") => { id: string } },
  tripId: string,
) {
  const user = c.get("user");
  const trip = await getTripForUser(c.env.DB, tripId, user.id);
  return trip;
}

itineraryDayRoutes.post("/:tripId/days", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await assertTripOwned(c, tripId);
  if (!trip) return c.json({ error: "Trip not found" }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = addDaySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid day data" }, 400);
  }

  try {
    const day = await appendItineraryDay(c.env.DB, tripId, parsed.data.date);
    return c.json({ day }, 201);
  } catch {
    return c.json({ error: "Unable to add day" }, 500);
  }
});

itineraryDayRoutes.patch("/:tripId/days/:dayId", async (c) => {
  const tripId = c.req.param("tripId");
  const dayId = c.req.param("dayId");
  const trip = await assertTripOwned(c, tripId);
  if (!trip) return c.json({ error: "Trip not found" }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = updateDaySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid day data", details: parsed.error.flatten() }, 400);
  }

  const fields = {
    date: parsed.data.date,
    from_location: parsed.data.from_location ?? null,
    to_location: parsed.data.to_location ?? null,
    distance_km: parsed.data.distance_km ?? null,
    drive_time: parsed.data.drive_time ?? null,
    stay_location: parsed.data.stay_location ?? null,
    notes: parsed.data.notes ?? null,
    travel_budget: parsed.data.travel_budget ?? null,
    stay_budget: parsed.data.stay_budget ?? null,
    restaurant_budget: parsed.data.restaurant_budget ?? null,
    activities_budget: parsed.data.activities_budget ?? null,
    other_budget: parsed.data.other_budget ?? null,
    sightseeing: parsed.data.sightseeing,
    restaurants: parsed.data.restaurants,
    foods: parsed.data.foods,
  };

  const day = await updateItineraryDay(c.env.DB, tripId, dayId, fields);
  if (!day) {
    return c.json({ error: "Day not found" }, 404);
  }
  return c.json({ day });
});
