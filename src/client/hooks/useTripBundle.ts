import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import {
  addDraftExpense,
  appendDraftDay,
  deleteDraftExpense,
  draftExpenseSummary,
  getDraftTrip,
  isDraftTripId,
  saveDraftBundle,
  updateDraftDay,
  updateDraftExpense,
  type DraftExpenseInput,
} from "../lib/draft-trips";
import { addOneDay } from "../lib/dates";
import { emptyExpenseSummary } from "../lib/budget";
import type {
  ItineraryDay,
  Trip,
  TripExpense,
  TripExpenseSummary,
} from "../../shared/types";
import { formToDayPatch, type DayFormValues } from "../lib/dayForm";

export type TripBundle = {
  source: "draft" | "api";
  trip: Trip | null;
  days: ItineraryDay[];
  expenses: TripExpense[];
  expenseSummary: TripExpenseSummary;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  saveDay: (dayId: string, values: DayFormValues) => Promise<ItineraryDay>;
  addDay: () => Promise<void>;
  updateTripLocal: (trip: Trip) => void;
  createExpense: (input: DraftExpenseInput) => Promise<TripExpense>;
  updateExpense: (
    expenseId: string,
    input: Partial<DraftExpenseInput>,
  ) => Promise<TripExpense>;
  deleteExpense: (expenseId: string) => Promise<void>;
};

export function useTripBundle(tripId: string | undefined): TripBundle {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [expenseSummary, setExpenseSummary] =
    useState<TripExpenseSummary>(emptyExpenseSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDraft = tripId ? isDraftTripId(tripId) : false;

  const load = useCallback(async () => {
    if (!tripId) return;
    setError(null);
    if (isDraftTripId(tripId)) {
      const bundle = getDraftTrip(tripId);
      if (!bundle) {
        setError("Trip not found.");
        setTrip(null);
        setDays([]);
        setExpenses([]);
        setExpenseSummary(emptyExpenseSummary());
      } else {
        setTrip(bundle.trip);
        setDays(bundle.days);
        const ex = bundle.expenses ?? [];
        setExpenses(ex);
        setExpenseSummary(draftExpenseSummary(tripId));
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{
        trip: Trip;
        days: ItineraryDay[];
        expenses?: TripExpense[];
        expense_summary?: TripExpenseSummary;
      }>(`/api/trips/${tripId}`);
      setTrip(data.trip);
      setDays(data.days);
      setExpenses(data.expenses ?? []);
      setExpenseSummary(data.expense_summary ?? emptyExpenseSummary());
    } catch {
      setError("Unable to load this trip. Please try again.");
      setTrip(null);
      setDays([]);
      setExpenses([]);
      setExpenseSummary(emptyExpenseSummary());
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDay = useCallback(
    async (dayId: string, values: DayFormValues): Promise<ItineraryDay> => {
      if (!tripId) throw new Error("No trip");
      const patch = formToDayPatch(values);

      if (isDraftTripId(tripId)) {
        const bundle = updateDraftDay(tripId, dayId, (day) => ({
          ...day,
          ...patch,
          sightseeing: patch.sightseeing ?? day.sightseeing,
          restaurants: patch.restaurants ?? day.restaurants,
          foods: patch.foods ?? day.foods,
        }));
        if (!bundle) throw new Error("Draft not found");
        const updated = bundle.days.find((d) => d.id === dayId);
        if (!updated) throw new Error("Day not found");
        setDays(bundle.days);
        setTrip(bundle.trip);
        return updated;
      }

      const data = await apiFetch<{ day: ItineraryDay }>(
        `/api/trips/${tripId}/days/${dayId}`,
        { method: "PATCH", body: JSON.stringify({ ...patch, date: patch.date }) },
      );
      setDays((d) => d.map((day) => (day.id === data.day.id ? data.day : day)));
      return data.day;
    },
    [tripId],
  );

  const addDay = useCallback(async () => {
    if (!tripId || days.length === 0) return;
    const last = days[days.length - 1];
    const nextDate = addOneDay(last.date);

    if (isDraftTripId(tripId)) {
      const bundle = appendDraftDay(tripId, nextDate);
      if (!bundle) return;
      setDays(bundle.days);
      setTrip(bundle.trip);
      return;
    }

    const data = await apiFetch<{ day: ItineraryDay }>(
      `/api/trips/${tripId}/days`,
      { method: "POST", body: JSON.stringify({ date: nextDate }) },
    );
    setDays((d) => [...d, data.day]);
  }, [tripId, days]);

  const updateTripLocal = useCallback(
    (next: Trip) => {
      setTrip(next);
      if (tripId && isDraftTripId(tripId)) {
        const bundle = getDraftTrip(tripId);
        if (bundle) {
          saveDraftBundle({ ...bundle, trip: next });
        }
      }
    },
    [tripId],
  );

  const createExpense = useCallback(
    async (input: DraftExpenseInput): Promise<TripExpense> => {
      if (!tripId) throw new Error("No trip");

      if (isDraftTripId(tripId)) {
        const bundle = addDraftExpense(tripId, input);
        if (!bundle) throw new Error("Draft not found");
        const created = bundle.expenses![bundle.expenses!.length - 1]!;
        setExpenses(bundle.expenses ?? []);
        setExpenseSummary(draftExpenseSummary(tripId));
        return created;
      }

      const data = await apiFetch<{
        expense: TripExpense;
        summary: TripExpenseSummary;
      }>(`/api/trips/${tripId}/expenses`, {
        method: "POST",
        body: JSON.stringify(input),
      });
      setExpenses((prev) => [...prev, data.expense]);
      setExpenseSummary(data.summary);
      return data.expense;
    },
    [tripId],
  );

  const updateExpenseFn = useCallback(
    async (
      expenseId: string,
      input: Partial<DraftExpenseInput>,
    ): Promise<TripExpense> => {
      if (!tripId) throw new Error("No trip");

      if (isDraftTripId(tripId)) {
        const bundle = updateDraftExpense(tripId, expenseId, input);
        if (!bundle) throw new Error("Expense not found");
        const updated = bundle.expenses!.find((e) => e.id === expenseId);
        if (!updated) throw new Error("Expense not found");
        setExpenses(bundle.expenses ?? []);
        setExpenseSummary(draftExpenseSummary(tripId));
        return updated;
      }

      const data = await apiFetch<{
        expense: TripExpense;
        summary: TripExpenseSummary;
      }>(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      setExpenses((prev) =>
        prev.map((e) => (e.id === data.expense.id ? data.expense : e)),
      );
      setExpenseSummary(data.summary);
      return data.expense;
    },
    [tripId],
  );

  const deleteExpenseFn = useCallback(
    async (expenseId: string): Promise<void> => {
      if (!tripId) throw new Error("No trip");

      if (isDraftTripId(tripId)) {
        const bundle = deleteDraftExpense(tripId, expenseId);
        if (!bundle) throw new Error("Expense not found");
        setExpenses(bundle.expenses ?? []);
        setExpenseSummary(draftExpenseSummary(tripId));
        return;
      }

      const data = await apiFetch<{ summary: TripExpenseSummary }>(
        `/api/trips/${tripId}/expenses/${expenseId}`,
        { method: "DELETE" },
      );
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setExpenseSummary(data.summary);
    },
    [tripId],
  );

  return useMemo(
    () => ({
      source: isDraft ? ("draft" as const) : ("api" as const),
      trip,
      days,
      expenses,
      expenseSummary,
      loading,
      error,
      reload: load,
      saveDay,
      addDay,
      updateTripLocal,
      createExpense,
      updateExpense: updateExpenseFn,
      deleteExpense: deleteExpenseFn,
    }),
    [
      isDraft,
      trip,
      days,
      expenses,
      expenseSummary,
      loading,
      error,
      load,
      saveDay,
      addDay,
      updateTripLocal,
      createExpense,
      updateExpenseFn,
      deleteExpenseFn,
    ],
  );
}
