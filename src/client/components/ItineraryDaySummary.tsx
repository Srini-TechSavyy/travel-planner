import { useCallback, useEffect, useRef, useState } from "react";
import type { ItineraryDay } from "../../shared/types";
import { formatInr, formatShortDate } from "../lib/format";

function shortWeekday(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

type SummaryCardProps = {
  day: ItineraryDay;
  dayCost: number | null;
  active: boolean;
  onSelect: () => void;
};

export function ItineraryDaySummary({
  day,
  dayCost,
  active,
  onSelect,
}: SummaryCardProps) {
  const destination =
    day.to_location?.trim() || day.stay_location?.trim() || "—";

  return (
    <button
      type="button"
      data-day-id={day.id}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={`card flex w-[8rem] shrink-0 flex-col px-3 py-2.5 text-left transition hover:bg-slate-50 sm:w-[9.5rem] ${
        active ? "!border-teal-500 !bg-teal-50 ring-1 ring-teal-500" : ""
      }`}
    >
      <span className="text-sm font-bold text-slate-900">Day {day.day_number}</span>
      <span className="mt-0.5 text-xs text-slate-600">
        {formatShortDate(day.date)}, {shortWeekday(day.date)}
      </span>
      <span className="mt-1 truncate text-xs text-slate-700">{destination}</span>
      <span className="mt-1 text-sm font-bold tabular-nums text-slate-900">
        {dayCost != null ? formatInr(dayCost) : "—"}
      </span>
    </button>
  );
}

const scrollArrowButtonClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:hidden";

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 18l6-6-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type RowProps = {
  days: ItineraryDay[];
  activeDayId: string | null;
  costByDayId: Record<string, number | null>;
  onSelectDay: (dayId: string) => void;
};

export function ItineraryDaySummaryRow({
  days,
  activeDayId,
  costByDayId,
  onSelectDay,
}: RowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const edgeThreshold = 1;
    setCanScrollLeft(scrollLeft > edgeThreshold);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - edgeThreshold);
  }, []);

  const getScrollStep = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return 0;

    const firstCard = el.children[0] as HTMLElement;
    const styles = getComputedStyle(el);
    const gap =
      Number.parseFloat(styles.columnGap || styles.gap || "0") || 12;
    return (firstCard.offsetWidth + gap) * 2.5;
  }, []);

  const scrollByStep = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;

      const delta = getScrollStep() * (direction === "left" ? -1 : 1);
      el.scrollBy({ left: delta, behavior: "smooth" });
    },
    [getScrollStep],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();

    el.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [days, updateScrollState]);

  // Keep the active day visible within the horizontal selector.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeDayId) return;
    const target = el.querySelector<HTMLElement>(
      `[data-day-id="${CSS.escape(activeDayId)}"]`,
    );
    if (!target) return;
    const left =
      target.offsetLeft - el.offsetLeft - (el.clientWidth - target.offsetWidth) / 2;
    el.scrollTo({ left, behavior: "smooth" });
  }, [activeDayId]);

  if (days.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={scrollArrowButtonClass}
        aria-label="Scroll days left"
        disabled={!canScrollLeft}
        onClick={() => scrollByStep("left")}
      >
        <ChevronLeftIcon />
      </button>

      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        aria-label="Itinerary day overview"
      >
        {days.map((day) => (
          <ItineraryDaySummary
            key={day.id}
            day={day}
            dayCost={costByDayId[day.id] ?? null}
            active={day.id === activeDayId}
            onSelect={() => onSelectDay(day.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className={scrollArrowButtonClass}
        aria-label="Scroll days right"
        disabled={!canScrollRight}
        onClick={() => scrollByStep("right")}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
