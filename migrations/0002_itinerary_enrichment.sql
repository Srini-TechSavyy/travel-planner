PRAGMA foreign_keys = ON;

ALTER TABLE trips ADD COLUMN starting_location TEXT;
ALTER TABLE trips ADD COLUMN destination TEXT;

ALTER TABLE itinerary_days ADD COLUMN travel_budget INTEGER;
ALTER TABLE itinerary_days ADD COLUMN stay_budget INTEGER;
ALTER TABLE itinerary_days ADD COLUMN restaurant_budget INTEGER;
ALTER TABLE itinerary_days ADD COLUMN activities_budget INTEGER;
ALTER TABLE itinerary_days ADD COLUMN other_budget INTEGER;

CREATE TABLE trip_day_sightseeing (
  id TEXT PRIMARY KEY NOT NULL,
  trip_day_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (trip_day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_day_sightseeing_day ON trip_day_sightseeing(trip_day_id);

CREATE TABLE trip_day_restaurants (
  id TEXT PRIMARY KEY NOT NULL,
  trip_day_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (trip_day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_day_restaurants_day ON trip_day_restaurants(trip_day_id);

CREATE TABLE trip_day_foods (
  id TEXT PRIMARY KEY NOT NULL,
  trip_day_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (trip_day_id) REFERENCES itinerary_days(id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_day_foods_day ON trip_day_foods(trip_day_id);
