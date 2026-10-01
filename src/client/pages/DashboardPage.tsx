import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { ErrorMessage } from "../components/ErrorMessage";
import { LoadingState } from "../components/LoadingState";
import { TripCard } from "../components/TripCard";
import { useAuth } from "../hooks/useAuth";
import { useDraftTrips } from "../hooks/useDraftTrips";
import type { TripListItem } from "../../shared/types";

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const drafts = useDraftTrips();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const authError = searchParams.get("error") === "auth_failed";

  const loadTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ trips: TripListItem[] }>("/api/trips");
      setTrips(data.trips);
    } catch {
      setError("Unable to load your trips. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) void loadTrips();
  }, [authLoading, loadTrips]);

  useEffect(() => {
    if (authError) {
      const next = new URLSearchParams(searchParams);
      next.delete("error");
      setSearchParams(next, { replace: true });
    }
  }, [authError, searchParams, setSearchParams]);

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

  const hasAny = trips.length > 0 || drafts.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <section className="hero-banner px-6 py-12 sm:px-10 sm:py-14">
        <h1 className="max-w-xl text-3xl font-bold leading-tight sm:text-4xl">
          Plan your journey, one day at a time.
        </h1>
        <p className="mt-3 max-w-lg text-teal-50/95">
          Build your itinerary, organize your days, and keep your trip details in
          one place.
        </p>
        <Link to="/trips/new" className="btn-primary mt-8 bg-white text-teal-800 hover:bg-teal-50">
          + Create New Trip
        </Link>
      </section>

      {authError && (
        <div className="mt-6">
          <ErrorMessage message="Sign in failed. Please try again." />
        </div>
      )}
      {error && (
        <div className="mt-6">
          <ErrorMessage message={error} />
        </div>
      )}

      <section id="my-trips" className="mt-12">
        <h2 className="text-xl font-bold text-slate-900">My Trips</h2>
        {(loading || authLoading) && user && <LoadingState />}
        {!loading && !authLoading && !hasAny && (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-medium text-slate-800">No trips yet</p>
            <p className="mt-1 text-slate-600">
              Start planning your next journey.
            </p>
          </div>
        )}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {drafts.map((d) => (
            <TripCard key={d.trip.id} trip={d.trip} isDraft />
          ))}
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onDelete={handleDelete}
              deleting={deletingId === trip.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
