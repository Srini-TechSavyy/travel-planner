import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import {
  appendDraftDay,
  getDraftTrip,
  isDraftTripId,
  saveDraftBundle,
  updateDraftDay,
} from "../lib/draft-trips";
import { addOneDay } from "../lib/dates";
import type { ItineraryDay, Trip } from "../../shared/types";
import type { DayFormValues } from "../components/ItineraryDayForm";

export type TripBundle = {
  source: "draft" | "api";
  trip: Trip | null;
  days: ItineraryDay[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveDay: (dayId: string, values: DayFormValues) => Promise<ItineraryDay>;
  addDay: () => Promise<void>;
  updateTripLocal: (trip: Trip) => void;
};

function formToDayPatch(values: DayFormValues) {
  return {
    date: values.date,
    from_location: values.from_location.trim() || null,
    to_location: values.to_location.trim() || null,
    distance_km: values.distance_km ? Number(values.distance_km) : null,
    drive_time: values.drive_time.trim() || null,
    stay_name: values.stay_name.trim() || null,
    stay_location: values.stay_location.trim() || null,
    notes: values.notes.trim() || null,
    travel_budget: parseBudget(values.travel_budget),
    stay_budget: parseBudget(values.stay_budget),
    restaurant_budget: parseBudget(values.restaurant_budget),
    activities_budget: parseBudget(values.activities_budget),
    other_budget: parseBudget(values.other_budget),
    sightseeing: values.sightseeing,
    restaurants: values.restaurants,
    foods: values.foods,
  };
}

function parseBudget(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function useTripBundle(tripId: string | undefined): TripBundle {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDraft = tripId ? isDraftTripId(tripId) : false;

  const load = useCallback(async () => {
    if (!tripId) return;
    setError(null);
    if (isDraftTripId(tripId)) {
      const bundle = getDraftTrip(tripId);
      if (!bundle) {
        setError("Trip not found.");
        setTrip(null);
        setDays([]);
      } else {
        setTrip(bundle.trip);
        setDays(bundle.days);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ trip: Trip; days: ItineraryDay[] }>(
        `/api/trips/${tripId}`,
      );
      setTrip(data.trip);
      setDays(data.days);
    } catch {
      setError("Unable to load this trip. Please try again.");
      setTrip(null);
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDay = useCallback(
    async (dayId: string, values: DayFormValues): Promise<ItineraryDay> => {
      if (!tripId) throw new Error("No trip");
      const patch = formToDayPatch(values);

      if (isDraftTripId(tripId)) {
        const bundle = updateDraftDay(tripId, dayId, (day) => ({
          ...day,
          ...patch,
          sightseeing: patch.sightseeing ?? day.sightseeing,
          restaurants: patch.restaurants ?? day.restaurants,
          foods: patch.foods ?? day.foods,
        }));
        if (!bundle) throw new Error("Draft not found");
        const updated = bundle.days.find((d) => d.id === dayId);
        if (!updated) throw new Error("Day not found");
        setDays(bundle.days);
        setTrip(bundle.trip);
        return updated;
      }

      const data = await apiFetch<{ day: ItineraryDay }>(
        `/api/trips/${tripId}/days/${dayId}`,
        { method: "PATCH", body: JSON.stringify({ ...patch, date: patch.date }) },
      );
      setDays((d) => d.map((day) => (day.id === data.day.id ? data.day : day)));
      return data.day;
    },
    [tripId],
  );

  const addDay = useCallback(async () => {
    if (!tripId || days.length === 0) return;
    const last = days[days.length - 1];
    const nextDate = addOneDay(last.date);

    if (isDraftTripId(tripId)) {
      const bundle = appendDraftDay(tripId, nextDate);
      if (!bundle) return;
      setDays(bundle.days);
      setTrip(bundle.trip);
      return;
    }

    const data = await apiFetch<{ day: ItineraryDay }>(
      `/api/trips/${tripId}/days`,
      { method: "POST", body: JSON.stringify({ date: nextDate }) },
    );
    setDays((d) => [...d, data.day]);
  }, [tripId, days]);

  const updateTripLocal = useCallback(
    (next: Trip) => {
      setTrip(next);
      if (tripId && isDraftTripId(tripId)) {
        const bundle = getDraftTrip(tripId);
        if (bundle) {
          saveDraftBundle({ trip: next, days: bundle.days });
        }
      }
    },
    [tripId],
  );

  return {
    source: isDraft ? "draft" : "api",
    trip,
    days,
    loading,
    error,
    reload: load,
    saveDay,
    addDay,
    updateTripLocal,
  };
}
