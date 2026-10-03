export function formatDateRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startFmt = s.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = e.toLocaleDateString("en-US", opts);
  return `${startFmt} – ${endFmt}`;
}

export function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDayHeading(dayNumber: number, date: string): string {
  const d = new Date(`${date}T12:00:00`);
  const month = d
    .toLocaleDateString("en-US", { month: "short" })
    .toUpperCase();
  const day = d.getDate();
  return `DAY ${dayNumber} · ${month} ${day}`;
}

export function formatDayOfWeek(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
}

/** e.g. Saturday, Nov 7, 2026 — used in Edit Day modal header */
export function formatEditDayHeaderDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function tripDayCount(start: string, end: string): number {
  const s = new Date(`${start}T12:00:00`);
  const e = new Date(`${end}T12:00:00`);
  const diff = Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
  return diff + 1;
}

export function travelersLabel(adults: number, children: number): string {
  const parts: string[] = [];
  parts.push(`${adults} Adult${adults === 1 ? "" : "s"}`);
  if (children > 0) {
    parts.push(`${children} Kid${children === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}
