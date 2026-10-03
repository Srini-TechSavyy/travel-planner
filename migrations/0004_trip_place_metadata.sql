ALTER TABLE trips ADD COLUMN starting_location_place_id TEXT;
ALTER TABLE trips ADD COLUMN starting_location_lat REAL;
ALTER TABLE trips ADD COLUMN starting_location_lng REAL;
ALTER TABLE trips ADD COLUMN starting_location_country TEXT;
ALTER TABLE trips ADD COLUMN starting_location_admin_area TEXT;

ALTER TABLE trips ADD COLUMN destination_place_id TEXT;
ALTER TABLE trips ADD COLUMN destination_lat REAL;
ALTER TABLE trips ADD COLUMN destination_lng REAL;
ALTER TABLE trips ADD COLUMN destination_country TEXT;
ALTER TABLE trips ADD COLUMN destination_admin_area TEXT;
