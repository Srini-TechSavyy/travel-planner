import type { TripLocationMeta } from "../../shared/trip-location";

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const PLACES_BASE = "https://places.googleapis.com/v1/places";

const AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text";
const PLACE_DETAILS_FIELD_MASK =
  "id,displayName,location,addressComponents";

const INCLUDED_PRIMARY_TYPES = [
  "locality",
  "administrative_area_level_3",
  "administrative_area_level_2",
  "airport",
];

export type PlaceSuggestion = {
  placeId: string;
  label: string;
};

function getApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(getApiKey());
}

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
    };
  }>;
};

type PlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
};

function componentValue(
  components: PlaceDetailsResponse["addressComponents"],
  type: string,
): string | null {
  const match = components?.find((c) => c.types?.includes(type));
  return match?.longText ?? match?.shortText ?? null;
}

export async function fetchPlaceSuggestions(
  input: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
  console.debug("[LocationAutocomplete] fetchPlaceSuggestions() entered", {
    input,
    hasSessionToken: Boolean(sessionToken),
    signalAborted: signal?.aborted ?? false,
    apiKeyConfigured: Boolean(getApiKey()),
  });
  const apiKey = getApiKey();
  if (!apiKey) {
    console.debug(
      "[LocationAutocomplete] fetchPlaceSuggestions() returning early: no API key",
    );
    return [];
  }

  const response = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": AUTOCOMPLETE_FIELD_MASK,
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedPrimaryTypes: INCLUDED_PRIMARY_TYPES,
      languageCode: "en",
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Places autocomplete failed (${response.status})`);
  }

  const data = (await response.json()) as AutocompleteResponse;
  const suggestions: PlaceSuggestion[] = [];
  for (const item of data.suggestions ?? []) {
    const prediction = item.placePrediction;
    const placeId = prediction?.placeId;
    const label = prediction?.text?.text;
    if (placeId && label) {
      suggestions.push({ placeId, label });
    }
  }
  return suggestions;
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<TripLocationMeta & { display_name: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Google Places API key is not configured");
  }

  const encodedId = encodeURIComponent(placeId);
  const response = await fetch(
    `${PLACES_BASE}/${encodedId}?sessionToken=${encodeURIComponent(sessionToken)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
      },
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Place details failed (${response.status})`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  const displayName = data.displayName?.text?.trim();
  const id = data.id ?? placeId;

  if (lat == null || lng == null || !displayName) {
    throw new Error("Place details missing required fields");
  }

  return {
    place_id: id,
    display_name: displayName,
    lat,
    lng,
    country: componentValue(data.addressComponents, "country"),
    admin_area: componentValue(
      data.addressComponents,
      "administrative_area_level_1",
    ),
  };
}
