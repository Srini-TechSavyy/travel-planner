import { useEffect, useState, type FormEvent } from "react";
import type { DayListItem, ItineraryDay } from "../../shared/types";
import { InlineNameList } from "./InlineNameList";

export type DayFormValues = {
  date: string;
  from_location: string;
  to_location: string;
  distance_km: string;
  drive_time: string;
  stay_name: string;
  stay_location: string;
  notes: string;
  travel_budget: string;
  stay_budget: string;
  restaurant_budget: string;
  activities_budget: string;
  other_budget: string;
  sightseeing: DayListItem[];
  restaurants: DayListItem[];
  foods: DayListItem[];
};

type Props = {
  day: ItineraryDay;
  open: boolean;
  onClose: () => void;
  onSave: (values: DayFormValues) => Promise<void>;
};

export function ItineraryDayForm({ day, open, onClose, onSave }: Props) {
  const [values, setValues] = useState<DayFormValues>(() => toForm(day));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(toForm(day));
      setError(null);
    }
  }, [open, day]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave(values);
      onClose();
    } catch {
      setError("Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-day-title"
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="edit-day-title" className="text-lg font-semibold text-slate-900">
          Edit Day {day.day_number}
        </h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Travel
              </p>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  required
                  value={values.date}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, date: e.target.value }))
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">From</span>
                <input
                  value={values.from_location}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, from_location: e.target.value }))
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">To</span>
                <input
                  value={values.to_location}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, to_location: e.target.value }))
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Distance (km)</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={values.distance_km}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, distance_km: e.target.value }))
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Drive time</span>
                <input
                  value={values.drive_time}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, drive_time: e.target.value }))
                  }
                  className="input mt-1"
                  placeholder="~8 hrs"
                />
              </label>
              <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stay
              </p>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Hotel / Resort</span>
                <input
                  value={values.stay_name}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, stay_name: e.target.value }))
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Location</span>
                <input
                  value={values.stay_location}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, stay_location: e.target.value }))
                  }
                  className="input mt-1"
                />
              </label>
            </div>

            <div className="space-y-5">
              <InlineNameList
                label="Sightseeing"
                icon="📍"
                items={values.sightseeing}
                onChange={(items) =>
                  setValues((v) => ({ ...v, sightseeing: items }))
                }
                addLabel="Add sightseeing place"
              />
              <InlineNameList
                label="Restaurants"
                icon="🍴"
                items={values.restaurants}
                onChange={(items) =>
                  setValues((v) => ({ ...v, restaurants: items }))
                }
                addLabel="Add restaurant"
              />
              <InlineNameList
                label="Must Try Foods"
                icon="⭐"
                items={values.foods}
                onChange={(items) => setValues((v) => ({ ...v, foods: items }))}
                addLabel="Add food"
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Budget (optional)
            </p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(
                [
                  ["travel_budget", "Travel"],
                  ["stay_budget", "Stay"],
                  ["restaurant_budget", "Restaurants"],
                  ["activities_budget", "Activities"],
                  ["other_budget", "Other"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <input
                    type="number"
                    min={0}
                    value={values[key]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [key]: e.target.value }))
                    }
                    className="input mt-1"
                    placeholder="₹"
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              rows={2}
              value={values.notes}
              onChange={(e) =>
                setValues((v) => ({ ...v, notes: e.target.value }))
              }
              className="input mt-1 resize-y"
              placeholder="Optional notes"
            />
          </label>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save Day"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function toForm(day: ItineraryDay): DayFormValues {
  return {
    date: day.date,
    from_location: day.from_location ?? "",
    to_location: day.to_location ?? "",
    distance_km: day.distance_km != null ? String(day.distance_km) : "",
    drive_time: day.drive_time ?? "",
    stay_name: day.stay_name ?? "",
    stay_location: day.stay_location ?? "",
    notes: day.notes ?? "",
    travel_budget: day.travel_budget != null ? String(day.travel_budget) : "",
    stay_budget: day.stay_budget != null ? String(day.stay_budget) : "",
    restaurant_budget:
      day.restaurant_budget != null ? String(day.restaurant_budget) : "",
    activities_budget:
      day.activities_budget != null ? String(day.activities_budget) : "",
    other_budget: day.other_budget != null ? String(day.other_budget) : "",
    sightseeing: day.sightseeing ?? [],
    restaurants: day.restaurants ?? [],
    foods: day.foods ?? [],
  };
}
