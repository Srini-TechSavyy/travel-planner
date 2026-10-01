import type { ItineraryDay, Trip } from "../../shared/types";
import { buildTripRoute } from "./route";
const BASE = "/trip-defaults";

const beachImage = `${BASE}/beach.jpg`;
const genericImage = `${BASE}/generic.svg`;
const keralaImage = `${BASE}/kerala.jpg`;
const mountainsImage = `${BASE}/mountains.jpg`;
const templeImage = `${BASE}/temple.jpg`;

const CATEGORIES: { image: string; keywords: string[] }[] = [
  {
    image: keralaImage,
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
    image: beachImage,
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
    image: templeImage,
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
    image: mountainsImage,
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
  return genericImage;
}
