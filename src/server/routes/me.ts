import { Hono } from "hono";
import type { Env } from "../../env";
import { requireAuth, type AuthVariables } from "../auth/middleware";

export const meRoutes = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

function sendProfile(c: {
  get: (key: "user") => {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
  };
  json: (body: unknown) => Response;
}) {
  const user = c.get("user");
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url,
  });
}

meRoutes.get("/", requireAuth, (c) => sendProfile(c));
meRoutes.get("", requireAuth, (c) => sendProfile(c));
