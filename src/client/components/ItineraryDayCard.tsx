import type { ReactNode } from "react";
import type { DayListItem, ItineraryDay } from "../../shared/types";
import { formatDayOfWeek, formatShortDate } from "../lib/format";
import type { TripExpense } from "../../shared/types";
import {
  DayExpenseSection,
  StayInline,
  type DayBudgetHandlers,
} from "./DayBudgetSection";
import { PlaceLocationImage } from "./PlaceLocationImage";

const LIST_PREVIEW = 2;

type Props = {
  day: ItineraryDay;
  /** All expenses assigned to this day. */
  dayExpenses: TripExpense[];
  /** Daily estimated total (expenses, or legacy day budget fallback). */
  expenseAmount: number | null;
  budgetHandlers: DayBudgetHandlers;
  onEditDay: () => void;
};

export function ItineraryDayCard({
  day,
  dayExpenses,
  expenseAmount,
  budgetHandlers,
  onEditDay,
}: Props) {
  const from = day.from_location?.trim() ?? "";
  const to = day.to_location?.trim() ?? "";
  const hasFrom = from.length > 0;
  const hasTo = to.length > 0;
  const hasTravel = hasFrom || hasTo;

  const stayName = day.stay_name?.trim() ?? "";
  const stayLocation = day.stay_location?.trim() ?? "";
  // The first stay-category expense is the day's accommodation cost.
  const stayExpense =
    dayExpenses.find((e) => e.category === "stay") ?? null;
  const listedExpenses = dayExpenses.filter((e) => e.id !== stayExpense?.id);

  const travelMeta = [
    day.distance_km != null ? formatKm(day.distance_km) : null,
    day.drive_time ? `~${day.drive_time.replace(/^~/, "")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasItinerary =
    hasTravel ||
    day.sightseeing.length > 0 ||
    day.restaurants.length > 0 ||
    day.foods.length > 0 ||
    (day.notes && !hasTravel);

  return (
    <article className="card flex overflow-hidden">
      <PlaceLocationImage
        photo_name={day.stay_location_photo_name}
        place_id={day.stay_location_place_id}
        className="w-[4.25rem] shrink-0 self-stretch sm:w-24"
        imgClassName="h-full min-h-[5.5rem] w-full object-cover sm:min-h-[6rem]"
        maxWidthPx={400}
      />
      <div className="min-w-0 flex-1 p-4 sm:p-5">
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

      <div className="mt-3 text-sm">
        <Section title="Stay" icon="🏨">
          <StayInline
            dayId={day.id}
            stayName={stayName}
            stayLocation={stayLocation}
            stayExpense={stayExpense}
            handlers={budgetHandlers}
          />
        </Section>
      </div>

      <DayExpenseSection
        dayId={day.id}
        expenses={listedExpenses}
        handlers={budgetHandlers}
        dayTotal={expenseAmount}
      />
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
