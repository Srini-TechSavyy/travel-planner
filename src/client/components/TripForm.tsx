import { useState, useRef, type FormEvent, type ReactNode } from "react";
import type { TripLocationMeta } from "../../shared/trip-location";
import { tripLocationMetaFromPlace } from "../lib/trip-form-location";
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";
import { TripNameInput } from "./TripNameInput";

export type TripFormValues = {
  name: string;
  start_date: string;
  end_date: string;
  adults: number;
  children: number;
  starting_location: string;
  destination: string;
  starting_location_meta: TripLocationMeta | null;
  destination_meta: TripLocationMeta | null;
};

type Props = {
  initial?: Partial<TripFormValues>;
  onSubmit: (values: TripFormValues) => Promise<void>;
  submitLabel?: string;
};

export function TripForm({
  initial,
  onSubmit,
  submitLabel = "Create Trip",
}: Props) {
  const [values, setValues] = useState<TripFormValues>({
    name: initial?.name ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    adults: initial?.adults ?? 2,
    children: initial?.children ?? 0,
    starting_location: initial?.starting_location ?? "",
    destination: initial?.destination ?? "",
    starting_location_meta: initial?.starting_location_meta ?? null,
    destination_meta: initial?.destination_meta ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    setError(null);
    if (values.end_date < values.start_date) {
      setError("End date must be on or after start date.");
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    try {
      await onSubmit(values);
    } catch {
      setError("Unable to save your trip. Please try again.");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <Field label="Trip name">
        <TripNameInput
          value={values.name}
          onChange={(name) => setValues((v) => ({ ...v, name }))}
          placeholder="Kerala Family Trip"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start date">
          <input
            required
            type="date"
            value={values.start_date}
            onChange={(e) =>
              setValues((v) => ({ ...v, start_date: e.target.value }))
            }
            className="input"
          />
        </Field>
        <Field label="End date">
          <input
            required
            type="date"
            value={values.end_date}
            onChange={(e) =>
              setValues((v) => ({ ...v, end_date: e.target.value }))
            }
            className="input"
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Adults">
          <input
            required
            type="number"
            min={0}
            max={99}
            value={values.adults}
            onChange={(e) =>
              setValues((v) => ({ ...v, adults: Number(e.target.value) }))
            }
            className="input"
          />
        </Field>
        <Field label="Children">
          <input
            required
            type="number"
            min={0}
            max={99}
            value={values.children}
            onChange={(e) =>
              setValues((v) => ({ ...v, children: Number(e.target.value) }))
            }
            className="input"
          />
        </Field>
      </div>
      <Field label="Starting location">
        <LocationAutocompleteInput
          value={values.starting_location}
          placeholder="Chennai"
          selectedDisplayName={
            values.starting_location_meta ? values.starting_location : null
          }
          onValueChange={(starting_location) =>
            setValues((v) => ({ ...v, starting_location }))
          }
          onPlaceSelected={(place) =>
            setValues((v) => ({
              ...v,
              starting_location: place.display_name,
              starting_location_meta: tripLocationMetaFromPlace(place),
            }))
          }
          onPlaceCleared={() =>
            setValues((v) => ({ ...v, starting_location_meta: null }))
          }
        />
      </Field>
      <Field label="Destination">
        <LocationAutocompleteInput
          value={values.destination}
          placeholder="Kerala"
          selectedDisplayName={
            values.destination_meta ? values.destination : null
          }
          onValueChange={(destination) =>
            setValues((v) => ({ ...v, destination }))
          }
          onPlaceSelected={(place) =>
            setValues((v) => ({
              ...v,
              destination: place.display_name,
              destination_meta: tripLocationMetaFromPlace(place),
            }))
          }
          onPlaceCleared={() =>
            setValues((v) => ({ ...v, destination_meta: null }))
          }
        />
      </Field>
      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
