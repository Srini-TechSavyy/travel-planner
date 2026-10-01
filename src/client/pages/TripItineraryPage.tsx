import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { ItineraryDayForm } from "../components/ItineraryDayForm";
import { ItineraryDayCard } from "../components/ItineraryDayCard";
import { BudgetSummary } from "../components/BudgetSummary";
import { ErrorMessage } from "../components/ErrorMessage";
import { LoadingState } from "../components/LoadingState";
import { Toast } from "../components/Toast";
import { useAuth } from "../hooks/useAuth";
import { useTripBundle } from "../hooks/useTripBundle";
import {
  deleteDraftTrip,
  draftToImportPayload,
  getDraftTrip,
  isDraftTripId,
} from "../lib/draft-trips";
import { buildTripRoute, formatRoute } from "../lib/route";
import {
  formatDateRange,
  travelersLabel,
  tripDayCount,
} from "../lib/format";
import {
  consumePendingImport,
  stashPendingImport,
} from "../lib/pending-import";
import type { ItineraryDay } from "../../shared/types";

export function TripItineraryPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const bundle = useTripBundle(tripId);
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("saved") === "1") {
      setToast("Trip saved successfully");
      const next = new URLSearchParams(searchParams);
      next.delete("saved");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (authLoading || !tripId || !isDraftTripId(tripId)) return;
    const pendingId = consumePendingImport();
    if (!pendingId || pendingId !== tripId) return;
    if (!user) return;

    void (async () => {
      const draft = getDraftTrip(tripId);
      if (!draft) return;
      setSavingTrip(true);
      try {
        const data = await apiFetch<{
          trip: { id: string };
        }>("/api/trips/import", {
          method: "POST",
          body: JSON.stringify(draftToImportPayload(draft)),
        });
        deleteDraftTrip(tripId);
        navigate(`/trips/${data.trip.id}?saved=1`, { replace: true });
      } catch {
        setPageError("Unable to save trip. Please try again.");
      } finally {
        setSavingTrip(false);
      }
    })();
  }, [authLoading, user, tripId, navigate]);

  async function handleSaveTrip() {
    if (!tripId) return;
    setPageError(null);

    if (isDraftTripId(tripId)) {
      if (!user) {
        const returnPath = `/trips/${tripId}`;
        stashPendingImport(tripId);
        window.location.href = `/auth/google?return_to=${encodeURIComponent(returnPath)}`;
        return;
      }
      const draft = getDraftTrip(tripId);
      if (!draft) return;
      setSavingTrip(true);
      try {
        const data = await apiFetch<{ trip: { id: string } }>(
          "/api/trips/import",
          {
            method: "POST",
            body: JSON.stringify(draftToImportPayload(draft)),
          },
        );
        deleteDraftTrip(tripId);
        navigate(`/trips/${data.trip.id}?saved=1`, { replace: true });
      } catch {
        setPageError("Unable to save trip. Please try again.");
      } finally {
        setSavingTrip(false);
      }
      return;
    }

    setToast("Trip saved successfully");
    await refresh();
  }

  async function handleSaveDay(values: Parameters<typeof bundle.saveDay>[1]) {
    if (!editingDay) return;
    await bundle.saveDay(editingDay.id, values);
  }

  async function handleAddDay() {
    setAdding(true);
    setPageError(null);
    try {
      await bundle.addDay();
    } catch {
      setPageError("Unable to add day. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  if (bundle.loading || savingTrip) return <LoadingState />;
  if (!bundle.trip) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorMessage message={bundle.error ?? pageError ?? "Trip not found."} />
      </div>
    );
  }

  const trip = bundle.trip;
  const days = bundle.days;
  const routeStops = buildTripRoute(trip, days);
  const routeLabel = formatRoute(routeStops);
  const dayCount = tripDayCount(trip.start_date, trip.end_date);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        to="/"
        className="text-sm font-medium text-teal-700 hover:underline"
      >
        ← Back to My Trips
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{trip.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {formatDateRange(trip.start_date, trip.end_date)} · {dayCount} days
            · {travelersLabel(trip.adults, trip.children)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={
              isDraftTripId(trip.id)
                ? `/trips/new?edit=${trip.id}`
                : `/trips/${trip.id}/edit`
            }
            className="btn-secondary"
          >
            Edit Trip
          </Link>
          <button
            type="button"
            onClick={() => void handleSaveTrip()}
            disabled={savingTrip}
            className="btn-primary"
          >
            Save Trip
          </button>
        </div>
      </header>

      {routeLabel && (
        <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
          {routeStops.map((stop, i) => (
            <span key={`${stop}-${i}`} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-400">→</span>}
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-800">
                {stop}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-8">
        <BudgetSummary
          days={days}
          startDate={trip.start_date}
          endDate={trip.end_date}
        />
      </div>

      {(bundle.error || pageError) && (
        <div className="mt-4">
          <ErrorMessage message={bundle.error ?? pageError!} />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {days.map((day) => (
          <ItineraryDayCard
            key={day.id}
            day={day}
            onEdit={() => setEditingDay(day)}
          />
        ))}
      </div>

      <button
        type="button"
        disabled={adding || days.length === 0}
        onClick={() => void handleAddDay()}
        className="mt-8 w-full rounded-xl border border-dashed border-teal-300 bg-teal-50 py-3 text-sm font-medium text-teal-800 hover:bg-teal-100 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {adding ? "Adding…" : "+ Add day"}
      </button>

      {editingDay && (
        <ItineraryDayForm
          day={editingDay}
          open={!!editingDay}
          onClose={() => setEditingDay(null)}
          onSave={handleSaveDay}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
