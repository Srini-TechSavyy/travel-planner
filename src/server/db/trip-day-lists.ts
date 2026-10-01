export type ListRow = {
  id: string;
  trip_day_id: string;
  name: string;
  sort_order: number;
};

type ListKind = "sightseeing" | "restaurants" | "foods";

const TABLE: Record<ListKind, string> = {
  sightseeing: "trip_day_sightseeing",
  restaurants: "trip_day_restaurants",
  foods: "trip_day_foods",
};

export async function listItemsForDay(
  db: D1Database,
  tripDayId: string,
  kind: ListKind,
): Promise<ListRow[]> {
  const table = TABLE[kind];
  const result = await db
    .prepare(
      `SELECT id, trip_day_id, name, sort_order FROM ${table}
       WHERE trip_day_id = ? ORDER BY sort_order ASC, name ASC`,
    )
    .bind(tripDayId)
    .all<ListRow>();
  return result.results ?? [];
}

export async function listItemsForTripDays(
  db: D1Database,
  tripDayIds: string[],
): Promise<{
  sightseeing: Map<string, ListRow[]>;
  restaurants: Map<string, ListRow[]>;
  foods: Map<string, ListRow[]>;
}> {
  const sightseeing = new Map<string, ListRow[]>();
  const restaurants = new Map<string, ListRow[]>();
  const foods = new Map<string, ListRow[]>();
  if (tripDayIds.length === 0) {
    return { sightseeing, restaurants, foods };
  }

  const placeholders = tripDayIds.map(() => "?").join(", ");

  async function load(kind: ListKind, target: Map<string, ListRow[]>) {
    const table = TABLE[kind];
    const result = await db
      .prepare(
        `SELECT id, trip_day_id, name, sort_order FROM ${table}
         WHERE trip_day_id IN (${placeholders})
         ORDER BY sort_order ASC, name ASC`,
      )
      .bind(...tripDayIds)
      .all<ListRow>();
    for (const row of result.results ?? []) {
      const list = target.get(row.trip_day_id) ?? [];
      list.push(row);
      target.set(row.trip_day_id, list);
    }
  }

  await load("sightseeing", sightseeing);
  await load("restaurants", restaurants);
  await load("foods", foods);

  return { sightseeing, restaurants, foods };
}

export async function replaceDayLists(
  db: D1Database,
  tripDayId: string,
  lists: {
    sightseeing?: { name: string; sort_order?: number }[];
    restaurants?: { name: string; sort_order?: number }[];
    foods?: { name: string; sort_order?: number }[];
  },
): Promise<void> {
  const kinds: ListKind[] = ["sightseeing", "restaurants", "foods"];
  for (const kind of kinds) {
    const items = lists[kind];
    if (items === undefined) continue;
    const table = TABLE[kind];
    await db
      .prepare(`DELETE FROM ${table} WHERE trip_day_id = ?`)
      .bind(tripDayId)
      .run();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db
        .prepare(
          `INSERT INTO ${table} (id, trip_day_id, name, sort_order) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          tripDayId,
          item.name,
          item.sort_order ?? i,
        )
        .run();
    }
  }
}

export async function insertDayLists(
  db: D1Database,
  tripDayId: string,
  lists: {
    sightseeing?: { name: string; sort_order?: number }[];
    restaurants?: { name: string; sort_order?: number }[];
    foods?: { name: string; sort_order?: number }[];
  },
): Promise<void> {
  const kinds: ListKind[] = ["sightseeing", "restaurants", "foods"];
  for (const kind of kinds) {
    const items = lists[kind] ?? [];
    const table = TABLE[kind];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db
        .prepare(
          `INSERT INTO ${table} (id, trip_day_id, name, sort_order) VALUES (?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          tripDayId,
          item.name,
          item.sort_order ?? i,
        )
        .run();
    }
  }
}
