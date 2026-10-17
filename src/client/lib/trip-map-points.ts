import type { ItineraryDay, Trip } from "../../shared/types";
import type { LatLng, TripMapPoint } from "../../shared/trip-map";
import { fetchPlaceLocationCached } from "./google-places";
import { buildTripRoute } from "./route";

function coordsEqual(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

type RawPoint = Omit<TripMapPoint, "markerIndex">;

function pushPoint(raw: RawPoint[], point: RawPoint) {
  const last = raw[raw.length - 1];
  if (last && coordsEqual(last, point)) return;
  raw.push(point);
}

export function buildTripMapPoints(
  trip: Trip,
  days: ItineraryDay[],
): { points: TripMapPoint[]; unmappedStops: string[] } {
  const raw: RawPoint[] = [];

  if (
    trip.starting_location_lat != null &&
    trip.starting_location_lng != null
  ) {
    pushPoint(raw, {
      id: "start",
      label: trip.starting_location?.trim() || "Start",
      lat: trip.starting_location_lat,
      lng: trip.starting_location_lng,
      kind: "start",
      placeId: trip.starting_location_place_id ?? undefined,
    });
  }

  for (const day of days) {
    if (day.stay_location_lat != null && day.stay_location_lng != null) {
      const label =
        day.stay_location?.trim() ||
        day.stay_name?.trim() ||
        `Day ${day.day_number} stay`;
      pushPoint(raw, {
        id: `stay-${day.id}`,
        label,
        lat: day.stay_location_lat,
        lng: day.stay_location_lng,
        kind: "stay",
        dayNumber: day.day_number,
        placeId: day.stay_location_place_id ?? undefined,
      });
    }
  }

  if (trip.destination_lat != null && trip.destination_lng != null) {
    pushPoint(raw, {
      id: "destination",
      label: trip.destination?.trim() || "Destination",
      lat: trip.destination_lat,
      lng: trip.destination_lng,
      kind: "destination",
      placeId: trip.destination_place_id ?? undefined,
    });
  }

  const points: TripMapPoint[] = raw.map((p, index) => ({
    ...p,
    markerIndex: index + 1,
  }));

  const mappedLabels = new Set(
    points.map((p) => p.label.trim().toLowerCase()).filter(Boolean),
  );
  const routeStops = buildTripRoute(trip, days);
  const unmappedStops = routeStops.filter(
    (stop) => !mappedLabels.has(stop.trim().toLowerCase()),
  );

  return { points, unmappedStops };
}

export async function resolveTripMapCoordinates(
  trip: Trip,
  days: ItineraryDay[],
  signal?: AbortSignal,
): Promise<{ trip: Trip; days: ItineraryDay[] }> {
  let nextTrip = trip;
  let nextDays = days;

  if (
    trip.starting_location_place_id &&
    (trip.starting_location_lat == null || trip.starting_location_lng == null)
  ) {
    const coords = await fetchPlaceLocationCached(
      trip.starting_location_place_id,
      signal,
    );
    if (coords) {
      nextTrip = {
        ...nextTrip,
        starting_location_lat: coords.lat,
        starting_location_lng: coords.lng,
      };
    }
  }

  if (
    trip.destination_place_id &&
    (trip.destination_lat == null || trip.destination_lng == null)
  ) {
    const coords = await fetchPlaceLocationCached(
      trip.destination_place_id,
      signal,
    );
    if (coords) {
      nextTrip = {
        ...nextTrip,
        destination_lat: coords.lat,
        destination_lng: coords.lng,
      };
    }
  }

  const resolvedDays: ItineraryDay[] = [];
  for (const day of nextDays) {
    if (
      day.stay_location_place_id &&
      (day.stay_location_lat == null || day.stay_location_lng == null)
    ) {
      const coords = await fetchPlaceLocationCached(
        day.stay_location_place_id,
        signal,
      );
      if (coords) {
        resolvedDays.push({
          ...day,
          stay_location_lat: coords.lat,
          stay_location_lng: coords.lng,
        });
        continue;
      }
    }
    resolvedDays.push(day);
  }
  nextDays = resolvedDays;

  return { trip: nextTrip, days: nextDays };
}

export function filterMarkersForDay(
  points: TripMapPoint[],
  dayNumber: number,
  totalDays: number,
): TripMapPoint[] {
  return points.filter((p) => {
    if (p.kind === "start" && dayNumber === 1) return true;
    if (p.kind === "destination" && dayNumber === totalDays) return true;
    if (p.kind === "stay" && p.dayNumber === dayNumber) return true;
    return false;
  });
}

/** Ordered waypoints used to fetch driving routes for the current map mode. */
export function routeWaypointsForView(
  points: TripMapPoint[],
  mode: "all" | "day",
  dayNumber: number | null,
  totalDays: number,
): TripMapPoint[] {
  if (points.length === 0) return [];
  if (mode === "all") return points;

  const day = dayNumber ?? 1;
  const stayForDay = points.find(
    (p) => p.kind === "stay" && p.dayNumber === day,
  );
  const stayIndex = stayForDay
    ? points.findIndex((p) => p.id === stayForDay.id)
    : -1;

  if (stayIndex > 0) {
    return [points[stayIndex - 1], points[stayIndex]];
  }

  if (stayIndex === 0) {
    return [points[0]];
  }

  if (day === 1 && points[0]?.kind === "start") {
    return [points[0]];
  }

  if (day === totalDays && points[points.length - 1]?.kind === "destination") {
    const dest = points[points.length - 1];
    const prev = points[points.length - 2];
    return prev ? [prev, dest] : [dest];
  }

  return filterMarkersForDay(points, day, totalDays);
}
