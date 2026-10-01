import type { ItineraryDay, Trip } from "../../shared/types";

export function buildTripRoute(trip: Trip, days: ItineraryDay[]): string[] {
  const stops: string[] = [];

  function pushStop(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const last = stops[stops.length - 1];
    if (last?.toLowerCase() === trimmed.toLowerCase()) return;
    stops.push(trimmed);
  }

  if (trip.starting_location) pushStop(trip.starting_location);

  for (const day of days) {
    if (day.from_location) pushStop(day.from_location);
    if (day.to_location) pushStop(day.to_location);
  }

  if (trip.destination) pushStop(trip.destination);

  return stops;
}

export function formatRoute(stops: string[]): string {
  return stops.join(" → ");
}
