import type { ItineraryDay, Trip } from "../../shared/types";
import { buildTripRoute } from "./route";

const BASE = "/trip-defaults";

const CATEGORIES: { image: string; keywords: string[] }[] = [
  {
    image: `${BASE}/kerala.jpg`,
    keywords: [
      "kerala",
      "kumarakom",
      "alleppey",
      "alappuzha",
      "kochi",
      "cochin",
      "backwater",
    ],
  },
  {
    image: `${BASE}/beach.jpg`,
    keywords: [
      "pondicherry",
      "puducherry",
      "goa",
      "marina",
      "coastal",
      "beach",
    ],
  },
  {
    image: `${BASE}/temple.jpg`,
    keywords: [
      "madurai",
      "thanjavur",
      "tanjore",
      "rameswaram",
      "temple",
      "meenakshi",
    ],
  },
  {
    image: `${BASE}/mountains.jpg`,
    keywords: [
      "munnar",
      "ooty",
      "kodaikanal",
      "wayanad",
      "hill station",
      "mountains",
    ],
  },
];

function buildHaystack(
  trip: Pick<Trip, "destination" | "starting_location" | "name">,
  days?: ItineraryDay[],
): string {
  const parts: string[] = [
    trip.destination ?? "",
    trip.starting_location ?? "",
    trip.name ?? "",
  ];
  if (days) {
    for (const day of days) {
      parts.push(
        day.from_location ?? "",
        day.to_location ?? "",
        day.stay_location ?? "",
      );
    }
    parts.push(...buildTripRoute(trip as Trip, days));
  }
  return parts.join(" ").toLowerCase();
}

export function getDefaultTripImage(
  trip: Pick<Trip, "destination" | "starting_location" | "name">,
  days?: ItineraryDay[],
): string {
  const haystack = buildHaystack(trip, days);
  for (const { image, keywords } of CATEGORIES) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return image;
    }
  }
  return `${BASE}/generic.svg`;
}
