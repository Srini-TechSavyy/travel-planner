PRAGMA foreign_keys = ON;

CREATE TABLE trip_expenses (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL,
  day_id TEXT,
  category TEXT NOT NULL,
  expense_type TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (day_id) REFERENCES itinerary_days(id) ON DELETE SET NULL
);

CREATE INDEX idx_trip_expenses_trip_id ON trip_expenses(trip_id);
CREATE INDEX idx_trip_expenses_day_id ON trip_expenses(day_id);

-- Backfill legacy day budget columns into trip_expenses (columns preserved)
INSERT INTO trip_expenses (id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  trip_id,
  id,
  'travel',
  'taxi_local_transport',
  travel_budget,
  'Migrated from day budget',
  updated_at,
  updated_at
FROM itinerary_days
WHERE travel_budget IS NOT NULL AND travel_budget > 0;

INSERT INTO trip_expenses (id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  trip_id,
  id,
  'stay',
  'other_stay',
  stay_budget,
  'Migrated from day budget',
  updated_at,
  updated_at
FROM itinerary_days
WHERE stay_budget IS NOT NULL AND stay_budget > 0;

INSERT INTO trip_expenses (id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  trip_id,
  id,
  'food',
  'other_food',
  restaurant_budget,
  'Migrated from day budget',
  updated_at,
  updated_at
FROM itinerary_days
WHERE restaurant_budget IS NOT NULL AND restaurant_budget > 0;

INSERT INTO trip_expenses (id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  trip_id,
  id,
  'activities',
  'other_activity',
  activities_budget,
  'Migrated from day budget',
  updated_at,
  updated_at
FROM itinerary_days
WHERE activities_budget IS NOT NULL AND activities_budget > 0;

INSERT INTO trip_expenses (id, trip_id, day_id, category, expense_type, amount, notes, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
  trip_id,
  id,
  'other',
  'miscellaneous',
  other_budget,
  'Migrated from day budget',
  updated_at,
  updated_at
FROM itinerary_days
WHERE other_budget IS NOT NULL AND other_budget > 0;
