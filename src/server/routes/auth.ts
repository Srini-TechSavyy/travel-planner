import { Hono, type Context } from "hono";
import type { Env } from "../../env";
import {
  buildGoogleAuthUrl,
  clearOAuthReturnCookie,
  clearOAuthStateCookie,
  exchangeCodeAndUpsertUser,
  getOAuthReturnFromCookie,
  getOAuthStateFromCookie,
  isSafeReturnPath,
  oauthReturnCookieHeader,
  oauthStateCookieHeader,
} from "../auth/google";
import {
  clearSessionCookieHeader,
  createSessionToken,
  isSecureRequest,
  sessionCookieHeader,
} from "../auth/session";

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.get("/google", (c) => {
  const state = crypto.randomUUID();
  const secure = isSecureRequest(new URL(c.req.url));
  const returnTo = c.req.query("return_to");
  const url = buildGoogleAuthUrl(c.env, state);
  const res = c.redirect(url, 302);
  res.headers.append("Set-Cookie", oauthStateCookieHeader(state, secure));
  if (returnTo && isSafeReturnPath(returnTo)) {
    res.headers.append(
      "Set-Cookie",
      oauthReturnCookieHeader(returnTo, secure),
    );
  }
  return res;
});

async function handleOAuthCallback(c: Context<{ Bindings: Env }>) {
  const secure = isSecureRequest(new URL(c.req.url));
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = c.req.header("Cookie") ?? null;
  const cookieState = getOAuthStateFromCookie(cookieHeader);

  const clearState = clearOAuthStateCookie(secure);
  const returnPath =
    getOAuthReturnFromCookie(cookieHeader) ?? "/";
  const clearReturn = clearOAuthReturnCookie(secure);

  if (!code || !state || !cookieState || state !== cookieState) {
    const res = c.redirect("/?error=auth_failed", 302);
    res.headers.append("Set-Cookie", clearState);
    res.headers.append("Set-Cookie", clearReturn);
    return res;
  }

  try {
    const userId = await exchangeCodeAndUpsertUser(c.env, code);
    const sessionToken = await createSessionToken(userId, c.env.SESSION_SECRET);
    const res = c.redirect(returnPath, 302);
    res.headers.append("Set-Cookie", sessionCookieHeader(sessionToken, secure));
    res.headers.append("Set-Cookie", clearState);
    res.headers.append("Set-Cookie", clearReturn);
    return res;
  } catch {
    const res = c.redirect("/?error=auth_failed", 302);
    res.headers.append("Set-Cookie", clearState);
    res.headers.append("Set-Cookie", clearReturn);
    return res;
  }
}

authRoutes.get("/google/callback", (c) => handleOAuthCallback(c));
/** @deprecated Use /auth/google/callback; kept for older Google Console configs */
authRoutes.get("/callback", (c) => handleOAuthCallback(c));

authRoutes.post("/logout", (c) => {
  const secure = isSecureRequest(new URL(c.req.url));
  return c.json({ ok: true }, 200, {
    "Set-Cookie": clearSessionCookieHeader(secure),
  });
});
