import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  isExpenseTypeForCategory,
  type ExpenseCategory,
} from "../shared/expenses";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const locationString = z.string().trim().max(500).nullable().optional();

const placeIdString = z.string().trim().min(1).max(500).nullable().optional();
const photoNameString = z.string().trim().min(1).max(1000).nullable().optional();
const latitude = z.number().min(-90).max(90).nullable().optional();
const longitude = z.number().min(-180).max(180).nullable().optional();
const regionString = z.string().trim().max(200).nullable().optional();

const tripLocationFields = {
  starting_location: locationString,
  destination: locationString,
  starting_location_place_id: placeIdString,
  starting_location_lat: latitude,
  starting_location_lng: longitude,
  starting_location_country: regionString,
  starting_location_admin_area: regionString,
  starting_location_photo_name: photoNameString,
  destination_place_id: placeIdString,
  destination_lat: latitude,
  destination_lng: longitude,
  destination_country: regionString,
  destination_admin_area: regionString,
  destination_photo_name: photoNameString,
};

const dayStayLocationFields = {
  stay_location_place_id: placeIdString,
  stay_location_lat: latitude,
  stay_location_lng: longitude,
  stay_location_country: regionString,
  stay_location_admin_area: regionString,
  stay_location_photo_name: photoNameString,
};

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
    ...tripLocationFields,
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
    ...tripLocationFields,
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
  stay_name: z.string().trim().max(500).nullable().optional(),
  stay_location: z.string().trim().max(500).nullable().optional(),
  ...dayStayLocationFields,
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
  stay_name: z.string().trim().max(500).nullable().optional(),
  stay_location: z.string().trim().max(500).nullable().optional(),
  ...dayStayLocationFields,
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

const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES);

const expenseBodyFields = {
  category: expenseCategorySchema,
  expense_type: z.string().trim().min(1).max(100),
  amount: z.number().int().min(1).max(100_000_000),
  day_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
};

function expenseTypeMatchesCategory(
  data: { category: ExpenseCategory; expense_type: string },
  ctx: z.RefinementCtx,
) {
  if (!isExpenseTypeForCategory(data.category, data.expense_type)) {
    ctx.addIssue({
      code: "custom",
      message: "Expense type does not match category",
      path: ["expense_type"],
    });
  }
}

export const createExpenseSchema = z
  .object(expenseBodyFields)
  .superRefine(expenseTypeMatchesCategory);

export const updateExpenseSchema = z
  .object({
    category: expenseCategorySchema.optional(),
    expense_type: z.string().trim().min(1).max(100).optional(),
    amount: z.number().int().min(1).max(100_000_000).optional(),
    day_id: z.string().uuid().nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category && data.expense_type) {
      expenseTypeMatchesCategory(
        { category: data.category, expense_type: data.expense_type },
        ctx,
      );
    } else if (data.category && !data.expense_type) {
      ctx.addIssue({
        code: "custom",
        message: "Expense type required when category is set",
        path: ["expense_type"],
      });
    }
  });

const importExpenseSchema = z.object({
  id: z.string().uuid().optional(),
  day_id: z.string().uuid().nullable().optional(),
  category: expenseCategorySchema,
  expense_type: z.string().trim().min(1).max(100),
  amount: z.number().int().min(1).max(100_000_000),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const importTripSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(200),
    start_date: dateString,
    end_date: dateString,
    adults: z.number().int().min(0).max(99),
    children: z.number().int().min(0).max(99),
    ...tripLocationFields,
    days: z.array(importDaySchema).min(1).max(366),
    expenses: z.array(importExpenseSchema).max(500).optional(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "End date must be on or after start date",
    path: ["end_date"],
  });
