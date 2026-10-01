import { Hono } from "hono";
import type { Env } from "./env";
import { authRoutes } from "./server/routes/auth";
import { itineraryDayRoutes } from "./server/routes/itinerary-days";
import { meRoutes } from "./server/routes/me";
import { tripRoutes } from "./server/routes/trips";

const app = new Hono<{ Bindings: Env }>();

app.route("/auth", authRoutes);
app.route("/api/me", meRoutes);
app.route("/api/trips", tripRoutes);
app.route("/api/trips", itineraryDayRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
