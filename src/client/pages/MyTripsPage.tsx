import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { ErrorMessage } from "../components/ErrorMessage";
import { LoadingState } from "../components/LoadingState";
import { TripCard } from "../components/TripCard";
import type { Trip } from "../../shared/types";

export function MyTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<{ trips: Trip[] }>("/api/trips");
      setTrips(data.trips);
    } catch {
      setError("Unable to load your trips. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/trips/${id}`, { method: "DELETE" });
      setTrips((t) => t.filter((x) => x.id !== id));
    } catch {
      setError("Unable to delete trip. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">My Trips</h1>
        <Link
          to="/trips/new"
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          + New Trip
        </Link>
      </div>
      {error && <ErrorMessage message={error} />}
      {loading && <LoadingState />}
      {!loading && trips.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No trips yet. Create your first trip to get started.
        </p>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onDelete={handleDelete}
            deleting={deletingId === trip.id}
          />
        ))}
      </div>
    </div>
  );
}
