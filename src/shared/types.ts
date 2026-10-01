export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

export type Trip = {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
  adults: number;
  children: number;
  starting_location: string | null;
  destination: string | null;
  created_at: string;
  updated_at: string;
};

export type TripListItem = Trip & {
  budget_total: number | null;
};

export type DayListItem = {
  id: string;
  name: string;
  sort_order: number;
};

export type ItineraryDay = {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  from_location: string | null;
  to_location: string | null;
  distance_km: number | null;
  drive_time: string | null;
  stay_location: string | null;
  notes: string | null;
  travel_budget: number | null;
  stay_budget: number | null;
  restaurant_budget: number | null;
  activities_budget: number | null;
  other_budget: number | null;
  sightseeing: DayListItem[];
  restaurants: DayListItem[];
  foods: DayListItem[];
  created_at: string;
  updated_at: string;
};

export type DraftTripBundle = {
  trip: Trip;
  days: ItineraryDay[];
};
