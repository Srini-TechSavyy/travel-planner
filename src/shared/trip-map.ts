export type TripMapPointKind = "start" | "stay" | "destination";

export type TripMapPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  markerIndex: number;
  kind: TripMapPointKind;
  dayNumber?: number;
  placeId?: string;
};

export type LatLng = { lat: number; lng: number };
