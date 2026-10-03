import type { ReactNode } from "react";
import type { DayListItem, ItineraryDay } from "../../shared/types";
import { dayTotal, hasDayBudget } from "../lib/budget";
import { formatDayOfWeek, formatInr, formatShortDate } from "../lib/format";

const LIST_PREVIEW = 2;

type Props = {
  day: ItineraryDay;
  onEditDay: () => void;
  onBudget: () => void;
};

export function ItineraryDayCard({ day, onEditDay, onBudget }: Props) {
  const from = day.from_location?.trim() ?? "";
  const to = day.to_location?.trim() ?? "";
  const hasFrom = from.length > 0;
  const hasTo = to.length > 0;
  const hasTravel = hasFrom || hasTo;

  const stayName = day.stay_name?.trim() ?? "";
  const stayLocation = day.stay_location?.trim() ?? "";
  const stayDisplay = [stayName, stayLocation].filter(Boolean).join(" · ");

  const travelMeta = [
    day.distance_km != null ? formatKm(day.distance_km) : null,
    day.drive_time ? `~${day.drive_time.replace(/^~/, "")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasItinerary =
    hasTravel ||
    stayDisplay.length > 0 ||
    day.sightseeing.length > 0 ||
    day.restaurants.length > 0 ||
    day.foods.length > 0 ||
    (day.notes && !hasTravel);

  return (
    <article className="card p-4 sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-wide text-slate-900">
            Day {day.day_number}
          </h3>
          <p className="mt-0.5 text-sm leading-snug">
            <span className="font-semibold text-teal-800">
              {formatDayOfWeek(day.date)}
            </span>
            <span className="font-medium text-slate-600">
              , {formatShortDate(day.date)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button type="button" onClick={onEditDay} className="btn-secondary">
            Edit Day
          </button>
          <button type="button" onClick={onBudget} className="btn-secondary">
            Budget
          </button>
        </div>
      </header>

      {hasItinerary && (
        <div className="mt-3 space-y-3 text-sm">
          {hasTravel && (
            <div>
              <p className="font-medium text-slate-700">🚗 Travel</p>
              <div className="mt-1 leading-snug text-slate-900">
                {hasFrom && hasTo ? (
                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-medium">
                    <span>
                      <span className="font-normal text-slate-600">From:</span>{" "}
                      {from}
                    </span>
                    <span className="text-slate-400" aria-hidden>→</span>
                    <span>
                      <span className="font-normal text-slate-600">To:</span>{" "}
                      {to}
                    </span>
                  </p>
                ) : hasFrom ? (
                  <p>
                    <span className="text-slate-600">From:</span> {from}
                  </p>
                ) : (
                  <p>
                    <span className="text-slate-600">To:</span> {to}
                  </p>
                )}
                {travelMeta && (
                  <p className="mt-0.5 text-slate-600">{travelMeta}</p>
                )}
              </div>
            </div>
          )}

          {stayDisplay.length > 0 && (
            <Section title="Stay" icon="🏨">
              <p className="text-slate-700">{stayDisplay}</p>
            </Section>
          )}

          {day.sightseeing.length > 0 && (
            <Section title="Sightseeing" icon="📍">
              <NameList items={day.sightseeing} />
            </Section>
          )}

          {day.restaurants.length > 0 && (
            <Section title="Restaurants" icon="🍴">
              <NameList items={day.restaurants} />
            </Section>
          )}

          {day.foods.length > 0 && (
            <Section title="Must Try Foods" icon="⭐">
              <NameList items={day.foods} />
            </Section>
          )}

          {day.notes && !hasTravel && (
            <p className="text-slate-600">{day.notes}</p>
          )}
        </div>
      )}

      {hasDayBudget(day) && (
        <div
          className={
            hasItinerary
              ? "mt-4 border-t border-slate-100 pt-3"
              : "mt-3"
          }
        >
          <p className="text-sm font-medium text-slate-600">💰 Budget</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatInr(dayTotal(day))}
          </p>
        </div>
      )}
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
    <div>
      <p className="font-medium text-slate-700">
        {icon} {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NameList({ items }: { items: DayListItem[] }) {
  const visible = items.slice(0, LIST_PREVIEW);
  const more = items.length - visible.length;

  return (
    <ul className="space-y-0.5 text-slate-700">
      {visible.map((item) => (
        <li key={item.id} className="flex gap-2">
          <span className="text-slate-400" aria-hidden>•</span>
          <span>{item.name}</span>
        </li>
      ))}
      {more > 0 && (
        <li className="pl-4 text-slate-500">+ {more} more</li>
      )}
    </ul>
  );
}

function formatKm(km: number): string {
  if (Number.isInteger(km)) return `${km} km`;
  return `${km} km`;
}
