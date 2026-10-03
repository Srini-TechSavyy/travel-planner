import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { TripForm, type TripFormValues } from "../components/TripForm";
import { LoadingState } from "../components/LoadingState";
import { ErrorMessage } from "../components/ErrorMessage";
import { isDraftTripId } from "../lib/draft-trips";
import {
  tripFormValuesFromTrip,
  tripLocationFieldsFromForm,
} from "../lib/trip-form-location";
import type { Trip } from "../../shared/types";

export function EditTripPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId || isDraftTripId(tripId)) return;
    void (async () => {
      try {
        const data = await apiFetch<{ trip: Trip }>(`/api/trips/${tripId}`);
        setTrip(data.trip);
      } catch {
        setError("Unable to load trip.");
      } finally {
        setLoading(false);
      }
    })();
  }, [tripId]);

  if (tripId && isDraftTripId(tripId)) {
    return <Navigate to={`/trips/new?edit=${tripId}`} replace />;
  }

  async function handleSubmit(values: TripFormValues) {
    if (!tripId) return;
    await apiFetch(`/api/trips/${tripId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        adults: values.adults,
        children: values.children,
        ...tripLocationFieldsFromForm(values),
      }),
    });
    navigate(`/trips/${tripId}`);
  }

  if (loading) return <LoadingState />;
  if (!trip) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <ErrorMessage message={error ?? "Trip not found."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Edit Trip</h1>
      <div className="card mt-8 p-6">
        <TripForm
          initial={{
            name: trip.name,
            start_date: trip.start_date,
            end_date: trip.end_date,
            adults: trip.adults,
            children: trip.children,
            ...tripFormValuesFromTrip(trip),
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Trip"
        />
      </div>
    </div>
  );
}
