import { useState, type FormEvent, type ReactNode } from "react";

export type TripFormValues = {
  name: string;
  start_date: string;
  end_date: string;
  adults: number;
  children: number;
  starting_location: string;
  destination: string;
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (values.end_date < values.start_date) {
      setError("End date must be on or after start date.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch {
      setError("Unable to save your trip. Please try again.");
    } finally {
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
        <input
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className="input"
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
        <input
          value={values.starting_location}
          onChange={(e) =>
            setValues((v) => ({ ...v, starting_location: e.target.value }))
          }
          className="input"
          placeholder="Chennai"
        />
      </Field>
      <Field label="Destination">
        <input
          value={values.destination}
          onChange={(e) =>
            setValues((v) => ({ ...v, destination: e.target.value }))
          }
          className="input"
          placeholder="Kerala"
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
