import { Hono } from "hono";
import type { Env } from "../../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";
import { listDaysForTrip } from "../db/itinerary-days";
import {
  createTrip,
  deleteTripForUser,
  getTripForUser,
  importTripForUser,
  listTripsForUser,
  updateTripForUser,
} from "../db/trips";
import {
  createTripSchema,
  importTripSchema,
  updateTripSchema,
} from "../validation";

export const tripRoutes = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

tripRoutes.use("*", requireAuth);

tripRoutes.get("/", async (c) => {
  const user = c.get("user");
  const trips = await listTripsForUser(c.env.DB, user.id);
  return c.json({ trips });
});

tripRoutes.post("/import", async (c) => {
  const user = c.get("user");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = importTripSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid trip data", details: parsed.error.flatten() },
      400,
    );
  }
  try {
    const result = await importTripForUser(c.env.DB, user.id, parsed.data);
    return c.json(
      { trip: result.trip, days: result.days },
      result.created ? 201 : 200,
    );
  } catch {
    return c.json({ error: "Unable to import trip" }, 500);
  }
});

tripRoutes.post("/", async (c) => {
  const user = c.get("user");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = createTripSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid trip data", details: parsed.error.flatten() }, 400);
  }
  try {
    const { trip, created } = await createTrip(c.env.DB, {
      id: parsed.data.id,
      userId: user.id,
      ...parsed.data,
      starting_location: parsed.data.starting_location ?? null,
      destination: parsed.data.destination ?? null,
    });
    return c.json({ trip }, created ? 201 : 200);
  } catch (err) {
    console.error("POST /api/trips failed", {
      userId: user.id,
      tripId: parsed.data.id,
      err,
    });
    return c.json({ error: "Unable to create trip" }, 500);
  }
});

tripRoutes.get("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");
  const trip = await getTripForUser(c.env.DB, tripId, user.id);
  if (!trip) {
    return c.json({ error: "Trip not found" }, 404);
  }
  const days = await listDaysForTrip(c.env.DB, tripId);
  return c.json({ trip, days });
});

tripRoutes.patch("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = updateTripSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid trip data", details: parsed.error.flatten() }, 400);
  }
  const trip = await updateTripForUser(c.env.DB, tripId, user.id, {
    ...parsed.data,
    starting_location:
      parsed.data.starting_location !== undefined
        ? (parsed.data.starting_location ?? null)
        : undefined,
    destination:
      parsed.data.destination !== undefined
        ? (parsed.data.destination ?? null)
        : undefined,
    starting_location_place_id:
      parsed.data.starting_location_place_id !== undefined
        ? (parsed.data.starting_location_place_id ?? null)
        : undefined,
    starting_location_lat:
      parsed.data.starting_location_lat !== undefined
        ? (parsed.data.starting_location_lat ?? null)
        : undefined,
    starting_location_lng:
      parsed.data.starting_location_lng !== undefined
        ? (parsed.data.starting_location_lng ?? null)
        : undefined,
    starting_location_country:
      parsed.data.starting_location_country !== undefined
        ? (parsed.data.starting_location_country ?? null)
        : undefined,
    starting_location_admin_area:
      parsed.data.starting_location_admin_area !== undefined
        ? (parsed.data.starting_location_admin_area ?? null)
        : undefined,
    destination_place_id:
      parsed.data.destination_place_id !== undefined
        ? (parsed.data.destination_place_id ?? null)
        : undefined,
    destination_lat:
      parsed.data.destination_lat !== undefined
        ? (parsed.data.destination_lat ?? null)
        : undefined,
    destination_lng:
      parsed.data.destination_lng !== undefined
        ? (parsed.data.destination_lng ?? null)
        : undefined,
    destination_country:
      parsed.data.destination_country !== undefined
        ? (parsed.data.destination_country ?? null)
        : undefined,
    destination_admin_area:
      parsed.data.destination_admin_area !== undefined
        ? (parsed.data.destination_admin_area ?? null)
        : undefined,
  });
  if (!trip) {
    return c.json({ error: "Trip not found" }, 404);
  }
  return c.json({ trip });
});

tripRoutes.delete("/:tripId", async (c) => {
  const user = c.get("user");
  const tripId = c.req.param("tripId");
  const deleted = await deleteTripForUser(c.env.DB, tripId, user.id);
  if (!deleted) {
    return c.json({ error: "Trip not found" }, 404);
  }
  return c.json({ ok: true });
});
