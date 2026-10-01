import { Link } from "react-router-dom";
import type { Trip, TripListItem } from "../../shared/types";
import { hasAnyTripBudget, tripTotals } from "../lib/budget";
import { buildTripRoute, formatRoute } from "../lib/route";
import {
  formatDateRange,
  formatInr,
  travelersLabel,
  tripDayCount,
} from "../lib/format";
import { getDraftTrip, isDraftTripId } from "../lib/draft-trips";

type Props = {
  trip: Trip | TripListItem;
  isDraft?: boolean;
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

export function TripCard({ trip, isDraft, onDelete, deleting }: Props) {
  const days = tripDayCount(trip.start_date, trip.end_date);
  const draftBundle = isDraft ? getDraftTrip(trip.id) : null;
  const routeStops = draftBundle
    ? buildTripRoute(trip, draftBundle.days)
    : buildTripRoute(trip, []);
  const route = formatRoute(routeStops);

  let budgetLabel: string | null = null;
  if (isDraft && draftBundle && hasAnyTripBudget(draftBundle.days)) {
    budgetLabel = formatInr(tripTotals(draftBundle.days).total);
  } else if ("budget_total" in trip && trip.budget_total) {
    budgetLabel = formatInr(trip.budget_total);
  }

  return (
    <article className="card flex flex-col overflow-hidden">
      <div className="h-28 bg-gradient-to-br from-teal-600 to-teal-800" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">{trip.name}</h2>
          {isDraft && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
              Draft
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {days} days · {travelersLabel(trip.adults, trip.children)}
        </p>
        {route && (
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{route}</p>
        )}
        {budgetLabel && (
          <p className="mt-3 inline-flex self-start rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">
            Est. {budgetLabel}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={`/trips/${trip.id}`} className="btn-primary">
            View Trip
          </Link>
          <Link
            to={
              isDraft || isDraftTripId(trip.id)
                ? `/trips/new?edit=${trip.id}`
                : `/trips/${trip.id}/edit`
            }
            className="btn-secondary"
          >
            Edit
          </Link>
          {onDelete && !isDraft && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(trip.id)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:border-red-200 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
