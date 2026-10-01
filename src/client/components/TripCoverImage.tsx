import type { ItineraryDay, Trip } from "../../shared/types";
import { getDefaultTripImage } from "../lib/trip-default-image";

type Props = {
  trip: Pick<Trip, "destination" | "starting_location" | "name">;
  days?: ItineraryDay[];
  className?: string;
};

export function TripCoverImage({ trip, days, className = "h-36" }: Props) {
  const src = getDefaultTripImage(trip, days);
  return (
    <div className={`relative w-full shrink-0 overflow-hidden ${className}`}>
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
