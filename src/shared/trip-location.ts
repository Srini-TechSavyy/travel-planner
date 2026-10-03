import type { Trip } from "./types";

export type TripLocationMeta = {
  place_id: string;
  lat: number;
  lng: number;
  country: string | null;
  admin_area: string | null;
};

export type TripLocationFieldPrefix = "starting_location" | "destination";

export function tripLocationMetaFromTrip(
  trip: Trip,
  field: TripLocationFieldPrefix,
): TripLocationMeta | null {
  const placeId =
    field === "starting_location"
      ? trip.starting_location_place_id
      : trip.destination_place_id;
  if (!placeId) return null;

  const lat =
    field === "starting_location"
      ? trip.starting_location_lat
      : trip.destination_lat;
  const lng =
    field === "starting_location"
      ? trip.starting_location_lng
      : trip.destination_lng;
  if (lat == null || lng == null) return null;

  return {
    place_id: placeId,
    lat,
    lng,
    country:
      field === "starting_location"
        ? trip.starting_location_country
        : trip.destination_country,
    admin_area:
      field === "starting_location"
        ? trip.starting_location_admin_area
        : trip.destination_admin_area,
  };
}

export function tripLocationPayload(
  field: TripLocationFieldPrefix,
  displayText: string,
  meta: TripLocationMeta | null,
): Record<string, string | number | null> {
  const trimmed = displayText.trim();
  if (field === "starting_location") {
    return {
      starting_location: trimmed || null,
      starting_location_place_id: meta?.place_id ?? null,
      starting_location_lat: meta?.lat ?? null,
      starting_location_lng: meta?.lng ?? null,
      starting_location_country: meta?.country ?? null,
      starting_location_admin_area: meta?.admin_area ?? null,
    };
  }
  return {
    destination: trimmed || null,
    destination_place_id: meta?.place_id ?? null,
    destination_lat: meta?.lat ?? null,
    destination_lng: meta?.lng ?? null,
    destination_country: meta?.country ?? null,
    destination_admin_area: meta?.admin_area ?? null,
  };
}
