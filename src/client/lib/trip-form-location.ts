import {
  tripLocationMetaFromTrip,
  tripLocationPayload,
  type TripLocationMeta,
} from "../../shared/trip-location";
import type { Trip } from "../../shared/types";
export type TripLocationFormSlice = {
  starting_location: string;
  destination: string;
  starting_location_meta: TripLocationMeta | null;
  destination_meta: TripLocationMeta | null;
};

export function tripFormValuesFromTrip(trip: Trip): TripLocationFormSlice {
  return {
    starting_location: trip.starting_location ?? "",
    destination: trip.destination ?? "",
    starting_location_meta: tripLocationMetaFromTrip(trip, "starting_location"),
    destination_meta: tripLocationMetaFromTrip(trip, "destination"),
  };
}

export function tripLocationFieldsFromForm(
  values: TripLocationFormSlice,
): Record<string, string | number | null> {
  return {
    ...tripLocationPayload(
      "starting_location",
      values.starting_location,
      values.starting_location_meta,
    ),
    ...tripLocationPayload(
      "destination",
      values.destination,
      values.destination_meta,
    ),
  };
}

export function tripLocationMetaFromPlace(
  place: TripLocationMeta & { display_name: string },
): TripLocationMeta {
  return {
    place_id: place.place_id,
    lat: place.lat,
    lng: place.lng,
    country: place.country,
    admin_area: place.admin_area,
  };
}
