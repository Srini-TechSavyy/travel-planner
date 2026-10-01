import { createMiddleware } from "hono/factory";
import type { Env } from "../../env";
import { findUserById } from "../db/users";
import type { UserRow } from "../db/users";
import { getSessionTokenFromCookie, verifySessionToken } from "./session";

export type AuthVariables = {
  user: UserRow;
};

export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AuthVariables;
}>(async (c, next) => {
  const token = getSessionTokenFromCookie(c.req.header("Cookie") ?? null);
  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const payload = await verifySessionToken(token, c.env.SESSION_SECRET);
  if (!payload) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const user = await findUserById(c.env.DB, payload.userId);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
});
