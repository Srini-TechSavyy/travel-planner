import type { LatLng } from "../../shared/trip-map";

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const ROUTES_FIELD_MASK =
  "routes.legs.distanceMeters,routes.legs.duration,routes.legs.polyline.encodedPolyline,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";

export type RouteLegResult = {
  from: LatLng;
  to: LatLng;
  fromLabel?: string;
  toLabel?: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  encodedPolyline: string | null;
};

function getRoutesApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

function latLngPayload(point: LatLng) {
  return {
    location: {
      latLng: {
        latitude: point.lat,
        longitude: point.lng,
      },
    },
  };
}

type ComputeRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: { encodedPolyline?: string };
    legs?: Array<{
      distanceMeters?: number;
      duration?: string;
      polyline?: { encodedPolyline?: string };
    }>;
  }>;
};

function parseDurationSeconds(duration?: string): number | null {
  if (!duration) return null;
  const match = /^(\d+)s$/.exec(duration.trim());
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

export function formatRouteDistanceMeters(meters: number | null): string {
  if (meters == null || meters < 0) return "—";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatRouteDurationSeconds(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—";
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `~${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `~${hours} hr`;
  return `~${hours} hr ${minutes} min`;
}

export async function computeDrivingLeg(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<RouteLegResult> {
  const apiKey = getRoutesApiKey();
  if (!apiKey) {
    throw new Error("Google Maps API key is not configured");
  }

  const response = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": ROUTES_FIELD_MASK,
    },
    body: JSON.stringify({
      origin: latLngPayload(from),
      destination: latLngPayload(to),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Routes API failed (${response.status})`);
  }

  const data = (await response.json()) as ComputeRoutesResponse;
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];

  return {
    from,
    to,
    distanceMeters: leg?.distanceMeters ?? route?.distanceMeters ?? null,
    durationSeconds:
      parseDurationSeconds(leg?.duration) ??
      parseDurationSeconds(route?.duration),
    encodedPolyline:
      leg?.polyline?.encodedPolyline ??
      route?.polyline?.encodedPolyline ??
      null,
  };
}

export async function computeDrivingRoute(
  waypoints: LatLng[],
  signal?: AbortSignal,
): Promise<RouteLegResult[]> {
  if (waypoints.length < 2) return [];

  const legs: RouteLegResult[] = [];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const leg = await computeDrivingLeg(from, to, signal);
    legs.push(leg);
  }
  return legs;
}
