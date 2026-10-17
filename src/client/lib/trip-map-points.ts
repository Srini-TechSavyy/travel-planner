import type { ItineraryDay, Trip } from "../../shared/types";
import type { TripMapPoint } from "../../shared/trip-map";
import { fetchPlaceLocationCached } from "./google-places";
import { buildTripRoute } from "./route";
import {
  type LocationIdentity,
  locationIdentityFromStrings,
  sameLocation,
} from "./trip-map-location";

export {
  normalizeGooglePlaceId,
  normalizeLocationName,
  sameLocation,
} from "./trip-map-location";

type RawPoint = Omit<TripMapPoint, "markerIndex">;

function sortedDays(days: ItineraryDay[]): ItineraryDay[] {
  return [...days].sort((a, b) => a.day_number - b.day_number);
}

function stayPointsFromDays(days: ItineraryDay[]): RawPoint[] {
  const points: RawPoint[] = [];
  for (const day of sortedDays(days)) {
    if (day.stay_location_lat == null || day.stay_location_lng == null) {
      continue;
    }
    const label =
      day.stay_location?.trim() ||
      day.stay_name?.trim() ||
      `Day ${day.day_number} stay`;
    points.push({
      id: `stay-${day.id}`,
      label,
      lat: day.stay_location_lat,
      lng: day.stay_location_lng,
      kind: "stay",
      dayNumber: day.day_number,
      placeId: day.stay_location_place_id ?? undefined,
    });
  }
  return points;
}

function startIdentity(trip: Trip) {
  return locationIdentityFromStrings(
    trip.starting_location,
    trip.starting_location_place_id,
    trip.starting_location_lat,
    trip.starting_location_lng,
  );
}

function destinationIdentity(trip: Trip) {
  return locationIdentityFromStrings(
    trip.destination,
    trip.destination_place_id,
    trip.destination_lat,
    trip.destination_lng,
  );
}

function textMatchesStart(trip: Trip, text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  return sameLocation(
    startIdentity(trip),
    locationIdentityFromStrings(text, null, null, null),
  );
}

/** True when the itinerary ends by returning to the trip starting location. */
export function itineraryReturnsToStart(trip: Trip, days: ItineraryDay[]): boolean {
  const ordered = sortedDays(days);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const day = ordered[i];
    if (textMatchesStart(trip, day.to_location)) return true;
    if (textMatchesStart(trip, day.stay_location)) return true;
    if (textMatchesStart(trip, day.stay_name)) return true;
  }
  return false;
}

function hasStartCoords(trip: Trip): boolean {
  return trip.starting_location_lat != null && trip.starting_location_lng != null;
}

function hasDestinationCoords(trip: Trip): boolean {
  return trip.destination_lat != null && trip.destination_lng != null;
}

function startRawPoint(trip: Trip): RawPoint | null {
  if (!hasStartCoords(trip)) return null;
  return {
    id: "start",
    label: trip.starting_location?.trim() || "Start",
    lat: trip.starting_location_lat!,
    lng: trip.starting_location_lng!,
    kind: "start",
    placeId: trip.starting_location_place_id ?? undefined,
  };
}

function destinationRawPoint(trip: Trip): RawPoint | null {
  if (!hasDestinationCoords(trip)) return null;
  return {
    id: "destination",
    label: trip.destination?.trim() || "Destination",
    lat: trip.destination_lat!,
    lng: trip.destination_lng!,
    kind: "destination",
    placeId: trip.destination_place_id ?? undefined,
  };
}

function pointExists(points: RawPoint[], candidate: LocationIdentity): boolean {
  return points.some((p) =>
    sameLocation(
      { placeId: p.placeId, label: p.label, lat: p.lat, lng: p.lng },
      candidate,
    ),
  );
}

export function buildTripMapPoints(
  trip: Trip,
  days: ItineraryDay[],
): {
  points: TripMapPoint[];
  unmappedStops: string[];
  returnsToStart: boolean;
} {
  const returnsToStart = itineraryReturnsToStart(trip, days);
  const stays = stayPointsFromDays(days);
  const raw: RawPoint[] = [];

  const start = startRawPoint(trip);
  if (start) {
    const firstStay = stays[0];
    if (
      firstStay &&
      sameLocation(
        {
          placeId: start.placeId,
          label: start.label,
          lat: start.lat,
          lng: start.lng,
        },
        {
          placeId: firstStay.placeId,
          label: firstStay.label,
          lat: firstStay.lat,
          lng: firstStay.lng,
        },
      )
    ) {
      raw.push({
        ...firstStay,
        kind: "start",
        label: start.label,
      });
      raw.push(...stays.slice(1));
    } else {
      raw.push(start);
      raw.push(...stays);
    }
  } else {
    raw.push(...stays);
  }

  if (!returnsToStart) {
    const dest = destinationRawPoint(trip);
    if (dest && !pointExists(raw, destinationIdentity(trip))) {
      raw.push(dest);
    }
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

  return { points, unmappedStops, returnsToStart };
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

function locationFromPoint(point: TripMapPoint): LocationIdentity {
  return {
    placeId: point.placeId,
    label: point.label,
    lat: point.lat,
    lng: point.lng,
  };
}

/** Collapse consecutive waypoints at the same physical place (not global dedupe). */
export function collapseConsecutiveSameLocationWaypoints(
  waypoints: TripMapPoint[],
): TripMapPoint[] {
  if (waypoints.length === 0) return [];
  const collapsed: TripMapPoint[] = [waypoints[0]];
  for (let i = 1; i < waypoints.length; i++) {
    const prev = collapsed[collapsed.length - 1];
    const curr = waypoints[i];
    if (sameLocation(locationFromPoint(prev), locationFromPoint(curr))) {
      continue;
    }
    collapsed.push(curr);
  }
  return collapsed;
}

export function filterMarkersForDay(
  points: TripMapPoint[],
  dayNumber: number,
  totalDays: number,
  returnsToStart = false,
): TripMapPoint[] {
  return points.filter((p) => {
    if (p.kind === "start" && dayNumber === 1) return true;
    if (
      returnsToStart &&
      p.kind === "start" &&
      dayNumber === totalDays
    ) {
      return true;
    }
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
  returnsToStart = false,
): TripMapPoint[] {
  if (points.length === 0) return [];

  let raw: TripMapPoint[];
  if (mode === "all") {
    raw = points;
  } else {
    const day = dayNumber ?? 1;
    const startPoint = points.find((p) => p.kind === "start");

    if (day === totalDays && returnsToStart && startPoint) {
      const stayForDay = points.find(
        (p) => p.kind === "stay" && p.dayNumber === day,
      );
      if (stayForDay) {
        const stayIndex = points.findIndex((p) => p.id === stayForDay.id);
        if (stayIndex > 0) {
          raw = [points[stayIndex - 1], startPoint];
        } else {
          raw = [startPoint];
        }
      } else {
        const lastStay = [...points].reverse().find((p) => p.kind === "stay");
        if (lastStay && lastStay.id !== startPoint.id) {
          raw = [lastStay, startPoint];
        } else {
          raw = [startPoint];
        }
      }
    } else {
      const stayForDay = points.find(
        (p) => p.kind === "stay" && p.dayNumber === day,
      );
      const stayIndex = stayForDay
        ? points.findIndex((p) => p.id === stayForDay.id)
        : -1;

      if (stayIndex > 0) {
        raw = [points[stayIndex - 1], points[stayIndex]];
      } else if (stayIndex === 0) {
        raw = [points[0]];
      } else if (day === 1 && points[0]?.kind === "start") {
        raw = [points[0]];
      } else if (
        day === totalDays &&
        points[points.length - 1]?.kind === "destination"
      ) {
        const dest = points[points.length - 1];
        const prev = points[points.length - 2];
        raw = prev ? [prev, dest] : [dest];
      } else {
        raw = filterMarkersForDay(points, day, totalDays, returnsToStart);
      }
    }
  }

  return collapseConsecutiveSameLocationWaypoints(raw);
}
