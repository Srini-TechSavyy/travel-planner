import { useEffect, useMemo, useState } from "react";
import type { TripMapPoint } from "../../shared/trip-map";
import {
  computeDrivingRoute,
  type RouteLegResult,
} from "../lib/google-routes";

const routeCache = new Map<string, RouteLegResult[]>();

function cacheKey(waypoints: TripMapPoint[]): string {
  return waypoints.map((p) => `${p.lat},${p.lng}`).join("->");
}

export type TripMapRoutesState = {
  legs: RouteLegResult[];
  loading: boolean;
  error: string | null;
};

export function useTripMapRoutes(
  waypoints: TripMapPoint[],
  enabled: boolean,
): TripMapRoutesState {
  const key = useMemo(() => cacheKey(waypoints), [waypoints]);
  const [legs, setLegs] = useState<RouteLegResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || waypoints.length < 2) {
      setLegs([]);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = routeCache.get(key);
    if (cached) {
      setLegs(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const coords = waypoints.map((p) => ({ lat: p.lat, lng: p.lng }));
        const result = await computeDrivingRoute(coords, controller.signal);
        const enriched = result.map((leg, index) => ({
          ...leg,
          fromLabel: waypoints[index]?.label,
          toLabel: waypoints[index + 1]?.label,
        }));
        routeCache.set(key, enriched);
        setLegs(enriched);
      } catch (err) {
        if (controller.signal.aborted) return;
        setLegs([]);
        setError(
          err instanceof Error ? err.message : "Unable to load driving routes",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [enabled, key, waypoints]);

  return { legs, loading, error };
}
