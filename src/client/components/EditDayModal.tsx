import { useEffect, useState, type FormEvent } from "react";
import type { ItineraryDay } from "../../shared/types";
import {
  toItineraryFormValues,
  type DayItineraryFormValues,
} from "../lib/dayForm";
import { DayModalFormActions, DayModalShell } from "./DayModalShell";
import { InlineNameList } from "./InlineNameList";

type Props = {
  day: ItineraryDay;
  open: boolean;
  onClose: () => void;
  onSave: (values: DayItineraryFormValues) => Promise<void>;
};

export function EditDayModal({ day, open, onClose, onSave }: Props) {
  const [values, setValues] = useState<DayItineraryFormValues>(() =>
    toItineraryFormValues(day),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(toItineraryFormValues(day));
      setError(null);
    }
  }, [open, day]);

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
    <DayModalShell
      open={open}
      title={`Edit Day ${day.day_number}`}
      titleId="edit-day-title"
    >
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

        <DayModalFormActions
          saving={saving}
          saveLabel="Save Day"
          onCancel={onClose}
        />
      </form>
    </DayModalShell>
  );
}
