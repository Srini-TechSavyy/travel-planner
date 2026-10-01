import type { ItineraryDay, Trip } from "../../shared/types";
import { buildTripRoute } from "./route";

const BASE = "/trip-defaults";

const CATEGORIES: { file: string; keywords: string[] }[] = [
  {
    file: "kerala.jpg",
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
    file: "beach.jpg",
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
    file: "temple.jpg",
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
    file: "mountains.jpg",
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
  for (const { file, keywords } of CATEGORIES) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return `${BASE}/${file}`;
    }
  }
  return `${BASE}/generic.jpg`;
}
