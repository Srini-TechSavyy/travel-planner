import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { TripForm, type TripFormValues } from "../components/TripForm";
import { useAuth } from "../hooks/useAuth";
import {
  createDraftTrip,
  getDraftTrip,
  updateDraftTripMeta,
} from "../lib/draft-trips";
import type { Trip } from "../../shared/types";

export function CreateTripPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const editDraftId = params.get("edit");

  const editingDraft = useMemo(
    () => (editDraftId ? getDraftTrip(editDraftId) : null),
    [editDraftId],
  );

  async function handleSubmit(values: TripFormValues) {
    if (editingDraft) {
      updateDraftTripMeta(editingDraft.trip.id, {
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        adults: values.adults,
        children: values.children,
        starting_location: values.starting_location.trim() || null,
        destination: values.destination.trim() || null,
      });
      navigate(`/trips/${editingDraft.trip.id}`);
      return;
    }

    if (!user) {
      const bundle = createDraftTrip({
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        adults: values.adults,
        children: values.children,
        starting_location: values.starting_location,
        destination: values.destination,
      });
      navigate(`/trips/${bundle.trip.id}`);
      return;
    }

    const data = await apiFetch<{ trip: Trip }>("/api/trips", {
      method: "POST",
      body: JSON.stringify({
        name: values.name,
        start_date: values.start_date,
        end_date: values.end_date,
        adults: values.adults,
        children: values.children,
        starting_location: values.starting_location.trim() || null,
        destination: values.destination.trim() || null,
      }),
    });
    navigate(`/trips/${data.trip.id}`);
  }

  const initial = editingDraft
    ? {
        name: editingDraft.trip.name,
        start_date: editingDraft.trip.start_date,
        end_date: editingDraft.trip.end_date,
        adults: editingDraft.trip.adults,
        children: editingDraft.trip.children,
        starting_location: editingDraft.trip.starting_location ?? "",
        destination: editingDraft.trip.destination ?? "",
      }
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {editingDraft ? "Edit Trip" : "Create New Trip"}
          </h1>
          <div className="card mt-8 p-6">
            <TripForm
              initial={initial}
              onSubmit={handleSubmit}
              submitLabel={editingDraft ? "Save & Continue" : "Create Trip →"}
            />
          </div>
        </div>
        <div className="hidden rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 p-10 text-white lg:block">
          <p className="text-2xl font-semibold leading-snug">
            Turn your travel plans into great memories.
          </p>
        </div>
      </div>
    </div>
  );
}
