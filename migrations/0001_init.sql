PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  google_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE trips (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_trips_user_id ON trips(user_id);

CREATE TABLE itinerary_days (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  from_location TEXT,
  to_location TEXT,
  distance_km REAL,
  drive_time TEXT,
  stay_location TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  UNIQUE (trip_id, day_number)
);

CREATE INDEX idx_itinerary_days_trip_id ON itinerary_days(trip_id);
