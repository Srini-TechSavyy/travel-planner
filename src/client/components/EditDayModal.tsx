import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { ItineraryDay } from "../../shared/types";
import {
  toItineraryFormValues,
  type DayItineraryFormValues,
} from "../lib/dayForm";
import { formatEditDayHeaderDate } from "../lib/format";
import { DayModalFormActions, DayModalShell } from "./DayModalShell";
import { InlineNameList } from "./InlineNameList";

const fieldInputClass = "input py-1.5 text-sm";

type Props = {
  day: ItineraryDay;
  open: boolean;
  onClose: () => void;
  onSave: (values: DayItineraryFormValues) => Promise<void>;
};

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

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

  const headerDate = formatEditDayHeaderDate(values.date);

  return (
    <DayModalShell
      open={open}
      title={`Edit Day ${day.day_number}`}
      titleId="edit-day-title"
      maxWidthClass="max-w-2xl"
      subtitle={
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <p className="text-sm font-medium text-slate-600">{headerDate}</p>
          <label className="shrink-0">
            <span className="sr-only">Date</span>
            <input
              type="date"
              required
              value={values.date}
              onChange={(e) =>
                setValues((v) => ({ ...v, date: e.target.value }))
              }
              className="input max-w-[10.5rem] py-1 text-xs"
              aria-label="Date"
            />
          </label>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <FormSection title="Travel">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From">
                <input
                  value={values.from_location}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, from_location: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </Field>
              <Field label="To">
                <input
                  value={values.to_location}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, to_location: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Distance (km)">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={values.distance_km}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, distance_km: e.target.value }))
                  }
                  className={fieldInputClass}
                />
              </Field>
              <Field label="Drive time">
                <input
                  value={values.drive_time}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, drive_time: e.target.value }))
                  }
                  className={fieldInputClass}
                  placeholder="~8 hrs"
                />
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection title="Stay">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hotel / Resort">
              <input
                value={values.stay_name}
                onChange={(e) =>
                  setValues((v) => ({ ...v, stay_name: e.target.value }))
                }
                className={fieldInputClass}
              />
            </Field>
            <Field label="Location">
              <input
                value={values.stay_location}
                onChange={(e) =>
                  setValues((v) => ({ ...v, stay_location: e.target.value }))
                }
                className={fieldInputClass}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Plans">
          <div className="space-y-3">
            <InlineNameList
              label="Sightseeing"
              icon="📍"
              items={values.sightseeing}
              onChange={(items) =>
                setValues((v) => ({ ...v, sightseeing: items }))
              }
              addLabel="Add sightseeing place"
              compact
            />
            <InlineNameList
              label="Restaurants"
              icon="🍽"
              items={values.restaurants}
              onChange={(items) =>
                setValues((v) => ({ ...v, restaurants: items }))
              }
              addLabel="Add restaurant"
              compact
            />
            <InlineNameList
              label="Must Try Foods"
              icon="⭐"
              items={values.foods}
              onChange={(items) => setValues((v) => ({ ...v, foods: items }))}
              addLabel="Add food"
              compact
            />
          </div>
        </FormSection>

        <Field label="Notes">
          <textarea
            rows={2}
            value={values.notes}
            onChange={(e) =>
              setValues((v) => ({ ...v, notes: e.target.value }))
            }
            className={`${fieldInputClass} resize-y`}
            placeholder="Optional notes"
          />
        </Field>

        <DayModalFormActions
          saving={saving}
          saveLabel="Save Changes"
          onCancel={onClose}
          sticky
        />
      </form>
    </DayModalShell>
  );
}
