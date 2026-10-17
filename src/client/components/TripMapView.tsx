import { useEffect, useMemo, useRef, useState } from "react";
import type { ItineraryDay, Trip } from "../../shared/types";
import type { TripMapPoint } from "../../shared/trip-map";
import { useTripMapRoutes } from "../hooks/useTripMapRoutes";
import {
  googleMapsDirectionsUrl,
  googleMapsLegUrl,
} from "../lib/google-maps-links";
import { isGoogleMapsConfigured, loadGoogleMaps } from "../lib/google-maps-loader";
import {
  formatRouteDistanceMeters,
  formatRouteDurationSeconds,
} from "../lib/google-routes";
import {
  buildTripMapPoints,
  filterMarkersForDay,
  resolveTripMapCoordinates,
  routeWaypointsForView,
} from "../lib/trip-map-points";
import { formatShortDate } from "../lib/format";

type Props = {
  trip: Trip;
  days: ItineraryDay[];
};

type ScopeMode = "all" | "day";

function MapPinContent({ index }: { index: number }) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-bold text-white shadow-md"
      aria-hidden
    >
      {index}
    </div>
  );
}

export function TripMapView({ trip, days }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const [resolvedTrip, setResolvedTrip] = useState(trip);
  const [resolvedDays, setResolvedDays] = useState(days);
  const [resolving, setResolving] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [scope, setScope] = useState<ScopeMode>("all");
  const [selectedDay, setSelectedDay] = useState(1);

  const mapsConfigured = isGoogleMapsConfigured();
  const totalDays = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) : 0;

  useEffect(() => {
    const controller = new AbortController();
    setResolving(true);
    setResolveError(null);
    void (async () => {
      try {
        const resolved = await resolveTripMapCoordinates(
          trip,
          days,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setResolvedTrip(resolved.trip);
          setResolvedDays(resolved.days);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResolveError("Unable to load some location coordinates.");
        }
      } finally {
        if (!controller.signal.aborted) setResolving(false);
      }
    })();
    return () => controller.abort();
  }, [trip, days]);

  const { points, unmappedStops, returnsToStart } = useMemo(
    () => buildTripMapPoints(resolvedTrip, resolvedDays),
    [resolvedTrip, resolvedDays],
  );

  const visibleMarkers: TripMapPoint[] = useMemo(() => {
    if (scope === "all") return points;
    return filterMarkersForDay(points, selectedDay, totalDays, returnsToStart);
  }, [points, scope, selectedDay, totalDays, returnsToStart]);

  const routeWaypoints = useMemo(
    () =>
      routeWaypointsForView(
        points,
        scope,
        scope === "day" ? selectedDay : null,
        totalDays,
        returnsToStart,
      ),
    [points, scope, selectedDay, totalDays, returnsToStart],
  );

  const { legs, loading: routesLoading, error: routesError } = useTripMapRoutes(
    routeWaypoints,
    mapsConfigured && routeWaypoints.length >= 2,
  );

  const directionsUrl = useMemo(() => {
    const coords = routeWaypoints.map((p) => ({
      lat: p.lat,
      lng: p.lng,
    }));
    return googleMapsDirectionsUrl(coords);
  }, [routeWaypoints]);

  useEffect(() => {
    if (!mapsConfigured || !mapContainerRef.current) return;

    let cancelled = false;
    setMapError(null);

    void loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapContainerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });
        }
        setMapReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setMapError(
            err instanceof Error ? err.message : "Failed to load Google Maps",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mapsConfigured]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !mapsConfigured) return;

    for (const marker of markersRef.current) marker.setMap(null);
    for (const line of polylinesRef.current) line.setMap(null);
    markersRef.current = [];
    polylinesRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasBounds = false;

    for (const point of visibleMarkers) {
      const position = { lat: point.lat, lng: point.lng };
      const marker = new google.maps.Marker({
        map,
        position,
        title: point.label,
        label: {
          text: String(point.markerIndex),
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: "11px",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: "#0d9488",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(marker);
      bounds.extend(position);
      hasBounds = true;
    }

    for (const leg of legs) {
      if (leg.encodedPolyline) {
        const path = google.maps.geometry.encoding.decodePath(
          leg.encodedPolyline,
        );
        const polyline = new google.maps.Polyline({
          map,
          path,
          strokeColor: "#0d9488",
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        polylinesRef.current.push(polyline);
        for (const latLng of path) bounds.extend(latLng);
        hasBounds = true;
      } else {
        const path = [
          { lat: leg.from.lat, lng: leg.from.lng },
          { lat: leg.to.lat, lng: leg.to.lng },
        ];
        const polyline = new google.maps.Polyline({
          map,
          path,
          strokeColor: "#94a3b8",
          strokeOpacity: 0.7,
          strokeWeight: 2,
          icons: [
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
              offset: "0",
              repeat: "12px",
            },
          ],
        });
        polylinesRef.current.push(polyline);
        path.forEach((p) => bounds.extend(p));
        hasBounds = true;
      }
    }

    if (hasBounds) {
      map.fitBounds(bounds, 48);
    } else if (visibleMarkers[0]) {
      map.setCenter({
        lat: visibleMarkers[0].lat,
        lng: visibleMarkers[0].lng,
      });
      map.setZoom(8);
    }
  }, [mapReady, mapsConfigured, visibleMarkers, legs]);

  if (!mapsConfigured) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Map is not configured</p>
        <p className="mt-2">
          Add <code className="text-xs">VITE_GOOGLE_MAPS_API_KEY</code> to{" "}
          <code className="text-xs">.dev.vars</code> and enable Maps JavaScript
          API and Routes API. See the README for setup steps.
        </p>
      </div>
    );
  }

  const showMapOverlay = resolving || !mapReady || routesLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
          role="group"
          aria-label="Map scope"
        >
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              scope === "all"
                ? "bg-teal-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setScope("all")}
          >
            All trip
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              scope === "day"
                ? "bg-teal-600 text-white"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setScope("day")}
          >
            By day
          </button>
        </div>

        {directionsUrl && routeWaypoints.length >= 2 && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            Open in Google Maps
          </a>
        )}
      </div>

      {scope === "day" && days.length > 0 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Select day"
        >
          {days.map((day) => {
            const selected = day.day_number === selectedDay;
            return (
              <button
                key={day.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs ${
                  selected
                    ? "border-teal-600 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => setSelectedDay(day.day_number)}
              >
                <span className="block font-bold">Day {day.day_number}</span>
                <span className="mt-0.5 block text-slate-600">
                  {formatShortDate(day.date)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div
          ref={mapContainerRef}
          className="min-h-[50vh] w-full sm:min-h-[420px]"
          aria-label="Trip map"
        />
        {showMapOverlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-700">
            Loading map…
          </div>
        )}
        {mapError && (
          <div className="absolute inset-x-0 bottom-0 bg-red-50 px-3 py-2 text-sm text-red-800">
            {mapError}
          </div>
        )}
      </div>

      {(resolveError || routesError) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {resolveError ?? routesError}
        </p>
      )}

      {points.length === 0 ? (
        <div className="card p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-900">No locations on the map yet</p>
          <p className="mt-1">
            Add a starting location, destination, or stay with Google Places on
            the trip or day forms to see markers here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900">Markers</h3>
            <ul className="mt-3 space-y-2">
              {visibleMarkers.map((point) => (
                <li
                  key={point.id}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <MapPinContent index={point.markerIndex} />
                  <div>
                    <p className="font-medium text-slate-900">{point.label}</p>
                    {point.dayNumber != null && (
                      <p className="text-xs text-slate-500">
                        Day {point.dayNumber}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            <h3 className="text-sm font-semibold text-slate-900">Driving legs</h3>
            {routeWaypoints.length < 2 ? (
              <p className="mt-2 text-sm text-slate-600">
                Select another day or add more geocoded stops to see routes.
              </p>
            ) : legs.length === 0 && !routesLoading ? (
              <p className="mt-2 text-sm text-slate-600">
                Route data is not available for this selection.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {legs.map((leg, index) => (
                  <li
                    key={`${leg.from.lat}-${leg.from.lng}-${leg.to.lat}-${leg.to.lng}-${index}`}
                    className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm"
                  >
                    <p className="font-medium text-slate-900">
                      {leg.fromLabel ?? "Start"} → {leg.toLabel ?? "End"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatRouteDistanceMeters(leg.distanceMeters)} ·{" "}
                      {formatRouteDurationSeconds(leg.durationSeconds)}
                    </p>
                    <a
                      href={googleMapsLegUrl(leg.from, leg.to)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-teal-700 hover:underline"
                    >
                      Open leg in Google Maps
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {unmappedStops.length > 0 && (
        <section className="card p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Not on map (no coordinates)
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            {unmappedStops.map((stop) => (
              <li key={stop}>{stop}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
