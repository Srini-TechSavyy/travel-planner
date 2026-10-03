import { useCallback, useEffect, useRef, useState } from "react";
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
};

export function ItineraryDaySummaryRow({ days }: RowProps) {
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
          <ItineraryDaySummary key={day.id} day={day} />
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
