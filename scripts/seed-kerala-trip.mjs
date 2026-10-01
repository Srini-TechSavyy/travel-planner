#!/usr/bin/env node
/**
 * Seeds the Kerala Anniversary sample trip for a user identified by email.
 * Requires local D1 with migrations applied and at least one Google sign-in.
 *
 * Usage: SEED_USER_EMAIL=you@gmail.com npm run db:seed
 */
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const email = process.env.SEED_USER_EMAIL;
if (!email) {
  console.error("Set SEED_USER_EMAIL to the Google account email in the users table.");
  process.exit(1);
}

const DB_NAME = "tripmate-db";

function d1Json(sql) {
  const out = execSync(
    `npx wrangler d1 execute ${DB_NAME} --local --command ${JSON.stringify(sql)} --json`,
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  const parsed = JSON.parse(out);
  const result = parsed[0]?.results;
  return result;
}

const users = d1Json(`SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}' LIMIT 1`);
if (!users?.length) {
  console.error(`No user found for email: ${email}. Sign in with Google locally first.`);
  process.exit(1);
}

const userId = users[0].id;
const tripId = randomUUID();
const now = new Date().toISOString();

const tripSql = `INSERT INTO trips (id, user_id, name, start_date, end_date, adults, children, created_at, updated_at)
VALUES ('${tripId}', '${userId}', 'Kerala Anniversary Trip', '2026-11-07', '2026-11-14', 2, 2, '${now}', '${now}')`;

execSync(`npx wrangler d1 execute ${DB_NAME} --local --command ${JSON.stringify(tripSql)}`, {
  stdio: "inherit",
});

const days = [
  {
    date: "2026-11-07",
    from: "Chennai",
    to: "Dindigul",
    km: 424,
    time: "7–8 hrs",
    stay: "Dindigul",
    notes: null,
  },
  {
    date: "2026-11-08",
    from: "Dindigul",
    to: "Gavi",
    km: 178,
    time: "3–4 hrs",
    stay: "Gavi",
    notes: null,
  },
  {
    date: "2026-11-09",
    from: "Gavi",
    to: "Gavi",
    km: null,
    time: null,
    stay: "Gavi",
    notes: "Full day",
  },
  {
    date: "2026-11-10",
    from: "Gavi",
    to: "Thekkady/Kumily",
    km: 40,
    time: "~1 hr",
    stay: "Thekkady",
    notes: null,
  },
  {
    date: "2026-11-11",
    from: "Thekkady",
    to: "Kumarakom",
    km: 120,
    time: "~3 hrs",
    stay: "Kumarakom",
    notes: null,
  },
  {
    date: "2026-11-12",
    from: "Kumarakom",
    to: "Kumarakom",
    km: null,
    time: null,
    stay: "Kumarakom",
    notes: "Resort day",
  },
  {
    date: "2026-11-13",
    from: "Kumarakom",
    to: "Salem",
    km: 392,
    time: "5½–6½ hrs",
    stay: "Salem",
    notes: null,
  },
  {
    date: "2026-11-14",
    from: "Salem",
    to: "Chennai",
    km: 340,
    time: "5½–6 hrs",
    stay: "Home",
    notes: null,
  },
];

days.forEach((day, index) => {
  const id = randomUUID();
  const km = day.km != null ? day.km : "NULL";
  const from = day.from.replace(/'/g, "''");
  const to = day.to.replace(/'/g, "''");
  const time = day.time ? `'${day.time.replace(/'/g, "''")}'` : "NULL";
  const stay = day.stay ? `'${day.stay.replace(/'/g, "''")}'` : "NULL";
  const notes = day.notes ? `'${day.notes.replace(/'/g, "''")}'` : "NULL";
  const sql = `INSERT INTO itinerary_days (
    id, trip_id, day_number, date, from_location, to_location, distance_km, drive_time, stay_location, notes, created_at, updated_at
  ) VALUES (
    '${id}', '${tripId}', ${index + 1}, '${day.date}', '${from}', '${to}', ${km}, ${time}, ${stay}, ${notes}, '${now}', '${now}'
  )`;
  execSync(`npx wrangler d1 execute ${DB_NAME} --local --command ${JSON.stringify(sql)}`, {
    stdio: "inherit",
  });
});

console.log(`Seeded Kerala Anniversary Trip (${tripId}) for ${email}`);
