import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ItineraryDay, Trip } from "../../shared/types";
import {
  buildTripMapPoints,
  itineraryReturnsToStart,
  routeWaypointsForView,
} from "./trip-map-points";
import { normalizeGooglePlaceId, sameLocation } from "./trip-map-location";

const NOW = "2026-01-01T00:00:00.000Z";

function baseTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    user_id: "user-1",
    name: "Test Trip",
    start_date: "2026-11-07",
    end_date: "2026-11-14",
    adults: 2,
    children: 0,
    starting_location: null,
    destination: null,
    starting_location_place_id: null,
    starting_location_lat: null,
    starting_location_lng: null,
    starting_location_country: null,
    starting_location_admin_area: null,
    starting_location_photo_name: null,
    destination_place_id: null,
    destination_lat: null,
    destination_lng: null,
    destination_country: null,
    destination_admin_area: null,
    destination_photo_name: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function day(
  dayNumber: number,
  overrides: Partial<ItineraryDay> = {},
): ItineraryDay {
  return {
    id: `day-${dayNumber}`,
    trip_id: "trip-1",
    day_number: dayNumber,
    date: "2026-11-07",
    from_location: null,
    to_location: null,
    distance_km: null,
    drive_time: null,
    stay_name: null,
    stay_location: null,
    stay_location_place_id: null,
    stay_location_lat: null,
    stay_location_lng: null,
    stay_location_country: null,
    stay_location_admin_area: null,
    stay_location_photo_name: null,
    notes: null,
    travel_budget: null,
    stay_budget: null,
    restaurant_budget: null,
    activities_budget: null,
    other_budget: null,
    sightseeing: [],
    restaurants: [],
    foods: [],
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

const PLACE = {
  chennai: "ChIJchennai",
  coimbatore: "ChIJcoimbatore",
  munnar: "ChIJmunnar",
  kumarakom: "ChIJkumarakom",
  madurai: "ChIJmadurai",
  salem: "ChIJsalem",
  gavi: "ChIJgavi",
  repeat: "ChIJrepeat",
};

describe("trip-map-location", () => {
  it("normalizes Google place id prefixes", () => {
    assert.equal(
      normalizeGooglePlaceId("places/ChIJabc"),
      normalizeGooglePlaceId("ChIJabc"),
    );
  });

  it("matches locations by place id", () => {
    assert.equal(
      sameLocation(
        { placeId: "places/ChIJx", label: "A" },
        { placeId: "ChIJx", label: "B" },
      ),
      true,
    );
  });
});

describe("buildTripMapPoints", () => {
  it("does not append destination when it duplicates a stay (Kerala-style)", () => {
    const trip = baseTrip({
      starting_location: "Chennai",
      starting_location_place_id: PLACE.chennai,
      starting_location_lat: 13.08,
      starting_location_lng: 80.27,
      destination: "Kumarakom",
      destination_place_id: PLACE.kumarakom,
      destination_lat: 9.62,
      destination_lng: 76.43,
    });
    const days = [
      day(5, {
        stay_location: "Kumarakom",
        stay_location_place_id: PLACE.kumarakom,
        stay_location_lat: 9.62,
        stay_location_lng: 76.43,
      }),
      day(6, {
        stay_location: "Kumarakom",
        stay_location_place_id: PLACE.kumarakom,
        stay_location_lat: 9.62,
        stay_location_lng: 76.43,
      }),
      day(7, {
        stay_location: "Salem",
        stay_location_place_id: PLACE.salem,
        stay_location_lat: 11.66,
        stay_location_lng: 78.15,
      }),
      day(8, {
        to_location: "Chennai",
        stay_name: "Home",
      }),
    ];

    const { points, returnsToStart } = buildTripMapPoints(trip, days);
    assert.equal(returnsToStart, true);

    const kumarakomMarkers = points.filter((p) =>
      sameLocation(
        { placeId: p.placeId, label: p.label, lat: p.lat, lng: p.lng },
        { placeId: PLACE.kumarakom, label: "Kumarakom" },
      ),
    );
    assert.equal(kumarakomMarkers.length, 2);
    assert.equal(
      points.some((p) => p.kind === "destination" && p.id === "destination"),
      false,
    );
    assert.equal(points[points.length - 1]?.label, "Salem");
  });

  it("routes last day return to start without a Kumarakom leg", () => {
    const trip = baseTrip({
      starting_location: "Chennai",
      starting_location_place_id: PLACE.chennai,
      starting_location_lat: 13.08,
      starting_location_lng: 80.27,
      destination: "Kumarakom",
      destination_place_id: PLACE.kumarakom,
      destination_lat: 9.62,
      destination_lng: 76.43,
    });
    const days = [
      day(7, {
        stay_location: "Salem",
        stay_location_place_id: PLACE.salem,
        stay_location_lat: 11.66,
        stay_location_lng: 78.15,
      }),
      day(8, {
        from_location: "Salem",
        to_location: "Chennai",
      }),
    ];

    const { points, returnsToStart } = buildTripMapPoints(trip, days);
    assert.equal(itineraryReturnsToStart(trip, days), true);

    const waypoints = routeWaypointsForView(points, "day", 8, 8, returnsToStart);
    assert.equal(waypoints.length, 2);
    assert.equal(waypoints[0]?.label, "Salem");
    assert.equal(waypoints[1]?.label, "Chennai");
    assert.equal(
      waypoints.some((p) => p.label === "Kumarakom"),
      false,
    );
  });

  it("keeps repeat visits on different days", () => {
    const trip = baseTrip();
    const days = [
      day(3, {
        stay_location: "Repeatville",
        stay_location_place_id: PLACE.repeat,
        stay_location_lat: 10,
        stay_location_lng: 20,
      }),
      day(4, {
        stay_location: "Repeatville",
        stay_location_place_id: PLACE.repeat,
        stay_location_lat: 10,
        stay_location_lng: 20,
      }),
    ];

    const { points } = buildTripMapPoints(trip, days);
    assert.equal(points.length, 2);
    assert.equal(points[0]?.dayNumber, 3);
    assert.equal(points[1]?.dayNumber, 4);
    assert.notEqual(points[0]?.id, points[1]?.id);
  });

  it("keeps consecutive multi-night stays as separate markers", () => {
    const trip = baseTrip();
    const days = [
      day(2, {
        stay_location: "Gavi",
        stay_location_place_id: PLACE.gavi,
        stay_location_lat: 9.34,
        stay_location_lng: 77.14,
      }),
      day(3, {
        stay_location: "Gavi",
        stay_location_place_id: PLACE.gavi,
        stay_location_lat: 9.34,
        stay_location_lng: 77.14,
      }),
    ];

    const { points } = buildTripMapPoints(trip, days);
    assert.equal(points.length, 2);
    assert.equal(points[0]?.dayNumber, 2);
    assert.equal(points[1]?.dayNumber, 3);
  });
});

describe("collapseConsecutiveSameLocationWaypoints", () => {
  it("removes zero-distance legs between consecutive same-place stays", () => {
    const trip = baseTrip();
    const days = [
      day(2, {
        stay_location: "Munnar",
        stay_location_place_id: PLACE.munnar,
        stay_location_lat: 10.09,
        stay_location_lng: 77.06,
      }),
      day(3, {
        stay_location: "Munnar",
        stay_location_place_id: PLACE.munnar,
        stay_location_lat: 10.09,
        stay_location_lng: 77.06,
      }),
      day(4, {
        stay_location: "Kumarakom",
        stay_location_place_id: PLACE.kumarakom,
        stay_location_lat: 9.62,
        stay_location_lng: 76.43,
      }),
      day(5, {
        stay_location: "Kumarakom",
        stay_location_place_id: PLACE.kumarakom,
        stay_location_lat: 9.62,
        stay_location_lng: 76.43,
      }),
    ];

    const { points } = buildTripMapPoints(trip, days);
    assert.equal(points.length, 4);

    const route = routeWaypointsForView(points, "all", null, 5, false);
    assert.equal(route.length, 2);
    assert.equal(route[0]?.label, "Munnar");
    assert.equal(route[1]?.label, "Kumarakom");
  });

  it("preserves distinct consecutive destinations in a long loop", () => {
    const trip = baseTrip({
      starting_location: "Chennai",
      starting_location_place_id: PLACE.chennai,
      starting_location_lat: 13.08,
      starting_location_lng: 80.27,
      destination: "Madurai",
      destination_place_id: PLACE.madurai,
      destination_lat: 9.93,
      destination_lng: 78.12,
    });
    const days = [
      day(1, {
        stay_location: "Coimbatore",
        stay_location_place_id: PLACE.coimbatore,
        stay_location_lat: 11.02,
        stay_location_lng: 76.96,
      }),
      day(2, {
        stay_location: "Munnar",
        stay_location_place_id: PLACE.munnar,
        stay_location_lat: 10.09,
        stay_location_lng: 77.06,
      }),
      day(3, {
        stay_location: "Kumarakom",
        stay_location_place_id: PLACE.kumarakom,
        stay_location_lat: 9.62,
        stay_location_lng: 76.43,
      }),
      day(4, {
        stay_location: "Madurai",
        stay_location_place_id: PLACE.madurai,
        stay_location_lat: 9.93,
        stay_location_lng: 78.12,
      }),
    ];

    const { points, returnsToStart } = buildTripMapPoints(trip, days);
    const route = routeWaypointsForView(points, "all", null, 4, returnsToStart);
    assert.deepEqual(
      route.map((p) => p.label),
      ["Chennai", "Coimbatore", "Munnar", "Kumarakom", "Madurai"],
    );
  });

  it("keeps a later revisit after visiting other places", () => {
    const trip = baseTrip();
    const days = [
      day(1, {
        stay_location: "Munnar",
        stay_location_place_id: PLACE.munnar,
        stay_location_lat: 10.09,
        stay_location_lng: 77.06,
      }),
      day(2, {
        stay_location: "Kumarakom",
        stay_location_place_id: PLACE.kumarakom,
        stay_location_lat: 9.62,
        stay_location_lng: 76.43,
      }),
      day(3, {
        stay_location: "Munnar",
        stay_location_place_id: PLACE.munnar,
        stay_location_lat: 10.09,
        stay_location_lng: 77.06,
      }),
    ];

    const { points } = buildTripMapPoints(trip, days);
    const route = routeWaypointsForView(points, "all", null, 3, false);
    assert.deepEqual(
      route.map((p) => p.label),
      ["Munnar", "Kumarakom", "Munnar"],
    );
  });

  it("does not create a same-location leg on a multi-night day view", () => {
    const trip = baseTrip();
    const days = [
      day(2, {
        stay_location: "Gavi",
        stay_location_place_id: PLACE.gavi,
        stay_location_lat: 9.34,
        stay_location_lng: 77.14,
      }),
      day(3, {
        stay_location: "Gavi",
        stay_location_place_id: PLACE.gavi,
        stay_location_lat: 9.34,
        stay_location_lng: 77.14,
      }),
    ];

    const { points } = buildTripMapPoints(trip, days);
    const day3Route = routeWaypointsForView(points, "day", 3, 3, false);
    assert.equal(day3Route.length, 1);
    assert.equal(day3Route[0]?.label, "Gavi");
  });
});

describe("return-to-origin route waypoints", () => {
  it("routes Salem to Chennai on the final day without duplicate stops", () => {
    const trip = baseTrip({
      starting_location: "Chennai",
      starting_location_place_id: PLACE.chennai,
      starting_location_lat: 13.08,
      starting_location_lng: 80.27,
    });
    const days = [
      day(7, {
        stay_location: "Salem",
        stay_location_place_id: PLACE.salem,
        stay_location_lat: 11.66,
        stay_location_lng: 78.15,
      }),
      day(8, {
        to_location: "Chennai",
      }),
    ];

    const { points, returnsToStart } = buildTripMapPoints(trip, days);
    const allRoute = routeWaypointsForView(points, "all", null, 8, returnsToStart);
    assert.deepEqual(
      allRoute.map((p) => p.label),
      ["Chennai", "Salem"],
    );

    const lastDay = routeWaypointsForView(points, "day", 8, 8, returnsToStart);
    assert.deepEqual(
      lastDay.map((p) => p.label),
      ["Salem", "Chennai"],
    );
  });
});
