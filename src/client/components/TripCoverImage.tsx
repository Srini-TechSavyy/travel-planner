import type { Trip } from "../../shared/types";
import { tripLocationMetaFromTrip } from "../../shared/trip-location";
import { PlaceLocationImage } from "./PlaceLocationImage";

type Props = {
  trip: Pick<Trip, "destination_place_id" | "destination_photo_name">;
  className?: string;
};

export function TripCoverImage({ trip, className = "h-36" }: Props) {
  const destination = tripLocationMetaFromTrip(trip as Trip, "destination");

  return (
    <PlaceLocationImage
      photo_name={destination?.photo_name ?? trip.destination_photo_name}
      place_id={destination?.place_id ?? trip.destination_place_id}
      className={`relative w-full shrink-0 ${className}`}
      maxWidthPx={1200}
    />
  );
}
