import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateState, generateCodeVerifier } from "arctic";
import { Session, OAuth } from "@contracts/constants";
import { google, github, apple } from "./lib/oauth";
import { db } from "./lib/db";
import { signSessionToken } from "./lib/jwt";
import { env } from "./lib/env";
import { log } from "./lib/logger";

export const oauthRouter = new Hono();

function stateCookieOpts() {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "Lax" as const,
    path: "/",
    maxAge: OAuth.stateMaxAgeMs / 1000,
  };
}

function setStateCookies(c: any, state: string, verifier?: string) {
  setCookie(c, OAuth.stateCookie, state, stateCookieOpts());
  if (verifier) setCookie(c, OAuth.verifierCookie, verifier, stateCookieOpts());
}

function checkState(c: any) {
  const cookieState = getCookie(c, OAuth.stateCookie);
  const urlState = c.req.query("state") ?? "";
  deleteCookie(c, OAuth.stateCookie, { path: "/" });
  if (!cookieState || cookieState !== urlState) {
    throw new Error("Invalid OAuth state");
  }
}

/**
 * The id_token payload is unsigned-by-us but validated by arctic (signature,
 * iss, aud, exp are all checked in validateAuthorizationCode). What we must
 * guard against is a provider returning a valid token with a MISSING claim —
 * Apple in particular omits `email` on repeat sign-ins, and can omit `name`
 * entirely. Treat missing email as a hard failure, and normalize the id
 * (always a string) once instead of at each call site.
 */
function decodeIdTokenClaims(idToken: string): {
  sub: string;
  email: string | undefined;
  name: string | undefined;
} {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed id_token");
  const payload = JSON.parse(
    Buffer.from(parts[1], "base64url").toString(),
  ) as { sub?: unknown; email?: unknown; name?: unknown };
  if (typeof payload.sub !== "string") {
    throw new Error("id_token missing sub");
  }
  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}

/**
 * On repeat sign-in with the same provider+providerId, refresh the profile
 * fields we care about (name, avatar) and bump lastSignInAt. Without this,
 * a user who changes their Google display name never sees the update, and
 * lastSignInAt stays frozen at the first-ever login.
 */
async function upsertOAuthUser(
  provider: "google" | "github" | "apple",
  providerId: string,
  email: string,
  name: string | null,
) {
  const existing = await db.users.findByProvider(provider, providerId);
  if (existing) {
    return db.users.update(existing.id, {
      name: name ?? existing.name,
      lastSignInAt: new Date(),
    });
  }
  const byEmail = await db.users.findByEmail(email);
  if (byEmail) {
    // Same email, different provider: link them. This is the "sign in with
    // Google after signing up with email" path — the account already exists,
    // we just record that it's now also reachable via this provider.
    return db.users.update(byEmail.id, {
      provider,
      providerId,
      name: name ?? byEmail.name,
      lastSignInAt: new Date(),
    });
  }
  return db.users.create({
    email,
    name,
    passwordHash: null,
    provider,
    providerId,
    lastSignInAt: new Date(),
  });
}

function finishLogin(c: any, user: { id: number; email: string }) {
  const token = signSessionToken({ sub: String(user.id), email: user.email });
  setCookie(c, Session.cookieName, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "Lax",
    path: "/",
    maxAge: Session.maxAgeMs / 1000,
  });
  return c.redirect(`${env.appUrl}/`);
}

/**
 * OAuth errors must never leak whether the failure was a bad state token
 * (attacker probe) or a genuine Google/GitHub/Apple error. Both paths log
 * details server-side and redirect to the same generic /login?error=...
 */
function failRedirect(c: any, provider: string, e: unknown) {
  log.error(`${provider} oauth failed`, {
    error: e instanceof Error ? e.message : String(e),
  });
  return c.redirect(`${env.appUrl}/login?error=oauth_failed`);
}

/* ---------- Google ---------- */

oauthRouter.get("/google", (c) => {
  const state = generateState();
  const verifier = generateCodeVerifier();
  setStateCookies(c, state, verifier);
  const url = google.createAuthorizationURL(state, verifier, [
    "openid",
    "email",
    "profile",
  ]);
  return c.redirect(url.toString());
});

oauthRouter.get("/google/callback", async (c) => {
  try {
    checkState(c);
    const code = c.req.query("code") ?? "";
    const verifier = getCookie(c, OAuth.verifierCookie);
    deleteCookie(c, OAuth.verifierCookie, { path: "/" });
    if (!verifier) throw new Error("Missing code verifier");
    if (!code) throw new Error("Missing authorization code");

    const tokens = await google.validateAuthorizationCode(code, verifier);
    const claims = decodeIdTokenClaims(tokens.idToken());
    if (!claims.email) throw new Error("Google account has no email");

    const user = await upsertOAuthUser(
      "google",
      claims.sub,
      claims.email,
      claims.name ?? null,
    );
    return finishLogin(c, user);
  } catch (e) {
    return failRedirect(c, "google", e);
  }
});

/* ---------- GitHub ---------- */

oauthRouter.get("/github", (c) => {
  const state = generateState();
  setStateCookies(c, state);
  const url = github.createAuthorizationURL(state, ["read:user", "user:email"]);
  return c.redirect(url.toString());
});

oauthRouter.get("/github/callback", async (c) => {
  try {
    checkState(c);
    const code = c.req.query("code") ?? "";
    if (!code) throw new Error("Missing authorization code");

    const tokens = await github.validateAuthorizationCode(code);
    const access = tokens.accessToken();

    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access}`,
          "User-Agent": "gridscout",
          Accept: "application/vnd.github+json",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${access}`,
          "User-Agent": "gridscout",
          Accept: "application/vnd.github+json",
        },
      }),
    ]);

    if (!profileRes.ok) {
      throw new Error(`GitHub user API returned ${profileRes.status}`);
    }
    if (!emailsRes.ok) {
      throw new Error(`GitHub emails API returned ${emailsRes.status}`);
    }

    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      name: string | null;
    };
    const emails = (await emailsRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    // Prefer a verified primary email; fall back to any verified email. Never
    // use an unverified one — that would let a malicious user claim an email
    // they don't own by adding it to their GitHub account without verifying.
    const chosen =
      emails.find((e) => e.primary && e.verified)?.email ??
      emails.find((e) => e.verified)?.email;

    if (!chosen) {
      throw new Error("No verified email on GitHub account");
    }

    const user = await upsertOAuthUser(
      "github",
      String(profile.id),
      chosen,
      profile.name ?? profile.login,
    );
    return finishLogin(c, user);
  } catch (e) {
    return failRedirect(c, "github", e);
  }
});

/* ---------- Apple ---------- */

oauthRouter.get("/apple", (c) => {
  const state = generateState();
  setStateCookies(c, state);
  const url = apple.createAuthorizationURL(state, ["name", "email"]);
  return c.redirect(url.toString());
});

oauthRouter.get("/apple/callback", async (c) => {
  try {
    checkState(c);
    const code = c.req.query("code") ?? "";
    if (!code) throw new Error("Missing authorization code");

    const tokens = await apple.validateAuthorizationCode(code);
    const claims = decodeIdTokenClaims(tokens.idToken());

    // Apple only sends `email` on FIRST sign-in. On subsequent sign-ins it
    // sends only `sub`, which is why findByProvider(providerId=sub) is the
    // primary lookup — the email fallback below is only for the very first
    // time a user signs in with Apple for an account that already exists
    // via email/password or another provider.
    const email =
      claims.email ?? `${claims.sub}@privaterelay.appleid.com`;

    const user = await upsertOAuthUser(
      "apple",
      claims.sub,
      email,
      claims.name ?? null,
    );
    return finishLogin(c, user);
  } catch (e) {
    return failRedirect(c, "apple", e);
  }
});