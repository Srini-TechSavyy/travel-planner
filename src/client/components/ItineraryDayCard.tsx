import type { ReactNode } from "react";
import type { ItineraryDay } from "../../shared/types";
import { dayCategories, dayTotal, hasDayBudget } from "../lib/budget";
import { formatDayHeading, formatInr } from "../lib/format";

type Props = {
  day: ItineraryDay;
  onEdit: () => void;
};

export function ItineraryDayCard({ day, onEdit }: Props) {
  const from = day.from_location?.trim() ?? "";
  const to = day.to_location?.trim() ?? "";
  const hasRoute = from && to;

  const budgetRows = hasDayBudget(day)
    ? (
        [
          ["Travel", dayCategories(day).travel],
          ["Stay", dayCategories(day).stay],
          ["Restaurants", dayCategories(day).restaurants],
          ["Activities", dayCategories(day).activities],
          ["Other", dayCategories(day).other],
        ] as const
      ).filter(([, v]) => v > 0)
    : [];

  return (
    <article className="card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="text-sm font-bold tracking-wide text-slate-900">
            {formatDayHeading(day.day_number, day.date)}
          </h3>

          {hasRoute && (
            <p className="font-medium text-slate-900">
              {from} → {to}
            </p>
          )}
          {hasRoute && (day.distance_km != null || day.drive_time) && (
            <p className="text-sm text-slate-600">
              {day.distance_km != null ? `${formatKm(day.distance_km)}` : ""}
              {day.distance_km != null && day.drive_time ? " · " : ""}
              {day.drive_time ? `~${day.drive_time.replace(/^~/, "")}` : ""}
            </p>
          )}

          {day.stay_location && (
            <div className="text-sm">
              <p className="font-medium text-slate-700">Stay</p>
              <p className="text-slate-600">{day.stay_location}</p>
            </div>
          )}

          {day.sightseeing.length > 0 && (
            <Section title="Sightseeing" icon="📍">
              <ul className="list-inside list-disc text-slate-700">
                {day.sightseeing.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </Section>
          )}

          {day.restaurants.length > 0 && (
            <Section title="Restaurants" icon="🍴">
              <ul className="list-inside list-disc text-slate-700">
                {day.restaurants.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </Section>
          )}

          {day.foods.length > 0 && (
            <Section title="Must Try Foods" icon="⭐">
              <ul className="list-inside list-disc text-slate-700">
                {day.foods.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            </Section>
          )}

          {hasDayBudget(day) ? (
            <div className="text-sm">
              <p className="font-medium text-slate-700">💰 Budget</p>
              <dl className="mt-1 space-y-0.5">
                {budgetRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="text-slate-600">{label}</dt>
                    <dd className="font-medium text-slate-900">
                      {formatInr(value)}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-slate-100 pt-1 font-semibold">
                  <dt className="text-slate-800">Day Total</dt>
                  <dd className="text-teal-700">{formatInr(dayTotal(day))}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="text-sm font-medium text-teal-700 hover:underline"
            >
              Add Budget
            </button>
          )}

          {day.notes && !hasRoute && (
            <p className="text-sm text-slate-600">{day.notes}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="btn-secondary shrink-0 self-start"
        >
          Edit Day
        </button>
      </div>
    </article>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <div className="text-sm">
      <p className="font-medium text-slate-700">
        {icon} {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function formatKm(km: number): string {
  if (Number.isInteger(km)) return `${km} km`;
  return `${km} km`;
}
