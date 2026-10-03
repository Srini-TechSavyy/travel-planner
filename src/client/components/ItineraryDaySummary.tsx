import type { ItineraryDay } from "../../shared/types";
import { formatShortDate } from "../lib/format";

type SummaryCardProps = {
  day: ItineraryDay;
};

export function ItineraryDaySummary({ day }: SummaryCardProps) {
  const stayName = day.stay_name?.trim() ?? "";
  const stayLine = stayName
    ? `Stay at ${stayName}`
    : "Stay not set";

  return (
    <article className="card flex w-[7.25rem] shrink-0 flex-col px-3 py-2.5 sm:w-[8.5rem]">
      <p className="text-sm font-bold text-slate-900">Day {day.day_number}</p>
      <p className="mt-0.5 text-xs text-slate-600">{formatShortDate(day.date)}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-700">
        {stayLine}
      </p>
    </article>
  );
}

type RowProps = {
  days: ItineraryDay[];
};

export function ItineraryDaySummaryRow({ days }: RowProps) {
  if (days.length === 0) return null;

  return (
    <div
      className="flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
      aria-label="Itinerary day overview"
    >
      {days.map((day) => (
        <ItineraryDaySummary key={day.id} day={day} />
      ))}
    </div>
  );
}
