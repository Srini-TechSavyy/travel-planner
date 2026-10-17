import type { LatLng } from "../../shared/trip-map";

export type LocationIdentity = {
  placeId?: string;
  label?: string;
  lat?: number;
  lng?: number;
};

export function normalizeGooglePlaceId(id: string): string {
  const trimmed = id.trim();
  const prefix = "places/";
  if (trimmed.startsWith(prefix)) {
    return trimmed.slice(prefix.length);
  }
  return trimmed;
}

export function normalizeLocationName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function coordsEqual(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;
}

export function sameLocation(a: LocationIdentity, b: LocationIdentity): boolean {
  const aPlace = a.placeId?.trim();
  const bPlace = b.placeId?.trim();
  if (aPlace && bPlace) {
    return (
      normalizeGooglePlaceId(aPlace) === normalizeGooglePlaceId(bPlace)
    );
  }

  const aName = a.label ? normalizeLocationName(a.label) : "";
  const bName = b.label ? normalizeLocationName(b.label) : "";
  if (aName && bName && aName === bName) {
    return true;
  }

  if (
    a.lat != null &&
    a.lng != null &&
    b.lat != null &&
    b.lng != null
  ) {
    return coordsEqual({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
  }

  return false;
}

export function locationIdentityFromStrings(
  label: string | null | undefined,
  placeId: string | null | undefined,
  lat: number | null | undefined,
  lng: number | null | undefined,
): LocationIdentity {
  return {
    label: label?.trim() || undefined,
    placeId: placeId ?? undefined,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
  };
}
