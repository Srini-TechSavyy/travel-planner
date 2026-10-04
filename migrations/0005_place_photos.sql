ALTER TABLE trips ADD COLUMN starting_location_photo_name TEXT;
ALTER TABLE trips ADD COLUMN destination_photo_name TEXT;

ALTER TABLE itinerary_days ADD COLUMN stay_location_place_id TEXT;
ALTER TABLE itinerary_days ADD COLUMN stay_location_lat REAL;
ALTER TABLE itinerary_days ADD COLUMN stay_location_lng REAL;
ALTER TABLE itinerary_days ADD COLUMN stay_location_country TEXT;
ALTER TABLE itinerary_days ADD COLUMN stay_location_admin_area TEXT;
ALTER TABLE itinerary_days ADD COLUMN stay_location_photo_name TEXT;
