import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const locationString = z.string().trim().max(500).nullable().optional();

const budgetField = z.number().int().min(0).max(100_000_000).nullable().optional();

const listItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(500),
  sort_order: z.number().int().min(0).max(999).optional(),
});

export const createTripSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200),
    start_date: dateString,
    end_date: dateString,
    adults: z.number().int().min(0).max(99),
    children: z.number().int().min(0).max(99),
    starting_location: locationString,
    destination: locationString,
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });

export const updateTripSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    start_date: dateString.optional(),
    end_date: dateString.optional(),
    adults: z.number().int().min(0).max(99).optional(),
    children: z.number().int().min(0).max(99).optional(),
    starting_location: locationString,
    destination: locationString,
  })
  .refine(
    (d) => {
      if (d.start_date && d.end_date) return d.end_date >= d.start_date;
      return true;
    },
    { message: "End date must be on or after start date", path: ["end_date"] },
  );

export const updateDaySchema = z.object({
  date: dateString,
  from_location: z.string().trim().max(500).nullable().optional(),
  to_location: z.string().trim().max(500).nullable().optional(),
  distance_km: z.number().min(0).max(50000).nullable().optional(),
  drive_time: z.string().trim().max(100).nullable().optional(),
  stay_location: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  travel_budget: budgetField,
  stay_budget: budgetField,
  restaurant_budget: budgetField,
  activities_budget: budgetField,
  other_budget: budgetField,
  sightseeing: z.array(listItemSchema).max(100).optional(),
  restaurants: z.array(listItemSchema).max(100).optional(),
  foods: z.array(listItemSchema).max(100).optional(),
});

export const addDaySchema = z.object({
  date: dateString,
});

const importDaySchema = z.object({
  id: z.string().uuid().optional(),
  day_number: z.number().int().min(1).max(366),
  date: dateString,
  from_location: z.string().trim().max(500).nullable().optional(),
  to_location: z.string().trim().max(500).nullable().optional(),
  distance_km: z.number().min(0).max(50000).nullable().optional(),
  drive_time: z.string().trim().max(100).nullable().optional(),
  stay_location: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  travel_budget: budgetField,
  stay_budget: budgetField,
  restaurant_budget: budgetField,
  activities_budget: budgetField,
  other_budget: budgetField,
  sightseeing: z.array(listItemSchema).max(100).optional(),
  restaurants: z.array(listItemSchema).max(100).optional(),
  foods: z.array(listItemSchema).max(100).optional(),
});

export const importTripSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200),
    start_date: dateString,
    end_date: dateString,
    adults: z.number().int().min(0).max(99),
    children: z.number().int().min(0).max(99),
    starting_location: locationString,
    destination: locationString,
    days: z.array(importDaySchema).min(1).max(366),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });
