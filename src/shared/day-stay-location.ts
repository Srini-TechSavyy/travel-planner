import type { ItineraryDay } from "./types";
import type { TripLocationMeta } from "./trip-location";

export function stayLocationMetaFromDay(
  day: ItineraryDay,
): TripLocationMeta | null {
  if (!day.stay_location_place_id) return null;
  if (day.stay_location_lat == null || day.stay_location_lng == null) return null;
  return {
    place_id: day.stay_location_place_id,
    lat: day.stay_location_lat,
    lng: day.stay_location_lng,
    country: day.stay_location_country,
    admin_area: day.stay_location_admin_area,
    photo_name: day.stay_location_photo_name,
  };
}

export function stayLocationPayload(
  displayText: string,
  meta: TripLocationMeta | null,
): {
  stay_location: string | null;
  stay_location_place_id: string | null;
  stay_location_lat: number | null;
  stay_location_lng: number | null;
  stay_location_country: string | null;
  stay_location_admin_area: string | null;
  stay_location_photo_name: string | null;
} {
  const trimmed = displayText.trim();
  return {
    stay_location: trimmed || null,
    stay_location_place_id: meta?.place_id ?? null,
    stay_location_lat: meta?.lat ?? null,
    stay_location_lng: meta?.lng ?? null,
    stay_location_country: meta?.country ?? null,
    stay_location_admin_area: meta?.admin_area ?? null,
    stay_location_photo_name: meta?.photo_name ?? null,
  };
}
