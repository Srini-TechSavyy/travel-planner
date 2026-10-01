import type { Env } from "../../env";
import { nowIso } from "../db/client";
import { findUserByGoogleId, insertUser, updateUser } from "../db/users";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_RETURN_COOKIE = "oauth_return_to";
const OAUTH_STATE_MAX_AGE = 600;
const OAUTH_RETURN_MAX_AGE = 600;

export function isSafeReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (path.includes("\\") || path.includes("\0")) return false;
  return true;
}

export function oauthReturnCookieHeader(path: string, secure: boolean): string {
  const encoded = encodeURIComponent(path);
  const parts = [
    `${OAUTH_RETURN_COOKIE}=${encoded}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${OAUTH_RETURN_MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearOAuthReturnCookie(secure: boolean): string {
  const parts = [
    `${OAUTH_RETURN_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function getOAuthReturnFromCookie(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === OAUTH_RETURN_COOKIE) {
      const raw = rest.join("=");
      if (!raw) return null;
      try {
        const path = decodeURIComponent(raw);
        return isSafeReturnPath(path) ? path : null;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Must match the redirect URI registered in Google Cloud Console. */
export const GOOGLE_OAUTH_REDIRECT_PATH = "/auth/google/callback";

export function googleOAuthRedirectUri(appUrl: string): string {
  const base = appUrl.replace(/\/$/, "");
  return `${base}${GOOGLE_OAUTH_REDIRECT_PATH}`;
}

export function oauthStateCookieHeader(state: string, secure: boolean): string {
  const parts = [
    `${OAUTH_STATE_COOKIE}=${state}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${OAUTH_STATE_MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearOAuthStateCookie(secure: boolean): string {
  const parts = [
    `${OAUTH_STATE_COOKIE}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function getOAuthStateFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === OAUTH_STATE_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export function buildGoogleAuthUrl(env: Env, state: string): string {
  const redirectUri = googleOAuthRedirectUri(env.APP_URL);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

export async function exchangeCodeAndUpsertUser(
  env: Env,
  code: string,
): Promise<string> {
  const redirectUri = googleOAuthRedirectUri(env.APP_URL);
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange OAuth code");
  }

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    throw new Error("Failed to fetch Google user info");
  }

  const profile = (await userRes.json()) as GoogleUserInfo;
  if (!profile.sub || !profile.email) {
    throw new Error("Invalid Google profile");
  }

  const existing = await findUserByGoogleId(env.DB, profile.sub);
  const ts = nowIso();

  if (existing) {
    await updateUser(env.DB, existing.id, {
      email: profile.email,
      name: profile.name ?? null,
      avatar_url: profile.picture ?? null,
      updated_at: ts,
    });
    return existing.id;
  }

  const id = crypto.randomUUID();
  await insertUser(env.DB, {
    id,
    google_id: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    avatar_url: profile.picture ?? null,
    created_at: ts,
    updated_at: ts,
  });
  return id;
}
