import type { LatLng } from "../../shared/trip-map";

const MAX_WAYPOINTS = 9;

function coordPair(point: LatLng): string {
  return `${point.lat},${point.lng}`;
}

export function googleMapsDirectionsUrl(
  waypoints: LatLng[],
): string | null {
  if (waypoints.length === 0) return null;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const params = new URLSearchParams({
    api: "1",
    origin: coordPair(origin),
    destination: coordPair(destination),
    travelmode: "driving",
  });

  if (waypoints.length > 2) {
    const middle = waypoints.slice(1, -1).slice(0, MAX_WAYPOINTS);
    params.set("waypoints", middle.map(coordPair).join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function googleMapsLegUrl(from: LatLng, to: LatLng): string {
  const params = new URLSearchParams({
    api: "1",
    origin: coordPair(from),
    destination: coordPair(to),
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
