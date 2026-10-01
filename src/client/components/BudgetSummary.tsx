import { hasAnyTripBudget, tripTotals } from "../lib/budget";
import { formatInr, tripDayCount } from "../lib/format";
import type { ItineraryDay } from "../../shared/types";

type Props = {
  days: ItineraryDay[];
  startDate: string;
  endDate: string;
};

export function BudgetSummary({ days, startDate, endDate }: Props) {
  if (!hasAnyTripBudget(days)) {
    return (
      <div className="card p-5">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          Estimated trip budget
        </p>
        <p className="mt-2 text-slate-600">Budget not added yet</p>
      </div>
    );
  }

  const totals = tripTotals(days);
  const dayCount = tripDayCount(startDate, endDate);
  const avg = dayCount > 0 ? Math.round(totals.total / dayCount) : 0;

  const rows = [
    { label: "Travel", value: totals.travel },
    { label: "Stay", value: totals.stay },
    { label: "Restaurants", value: totals.restaurants },
    { label: "Activities", value: totals.activities },
    { label: "Other", value: totals.other },
  ].filter((r) => r.value > 0);

  return (
    <div className="card p-5 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Estimated trip budget
          </p>
          <p className="mt-1 text-3xl font-bold text-teal-700">
            {formatInr(totals.total)}
          </p>
          <dl className="mt-4 space-y-1 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-8">
                <dt className="text-slate-600">{r.label}</dt>
                <dd className="font-medium text-slate-900">
                  {formatInr(r.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4 text-center md:min-w-[140px]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Average / day
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatInr(avg)}
          </p>
        </div>
      </div>
    </div>
  );
}
