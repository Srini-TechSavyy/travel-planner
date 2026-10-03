const TRIP_NAME_SUGGESTION_LABELS = [
  "Anniversary Trip",
  "Family Trip",
  "Kerala Trip",
  "Summer Vacation",
  "Weekend Getaway",
  "Birthday Trip",
  "Family Holiday",
  "Road Trip",
  "Christmas Vacation",
  "New Year Trip",
] as const;

/** Trip name templates with the calendar year applied at runtime. */
export function getTripNameSuggestions(referenceDate = new Date()): string[] {
  const year = referenceDate.getFullYear();
  return TRIP_NAME_SUGGESTION_LABELS.map((label) => {
    const suffixYear = label === "New Year Trip" ? year + 1 : year;
    return `${label} - ${suffixYear}`;
  });
}

export function filterTripNameSuggestions(
  suggestions: string[],
  query: string,
): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return suggestions;
  return suggestions.filter((name) =>
    name.toLowerCase().includes(normalized),
  );
}
