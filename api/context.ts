import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { parse as parseCookie } from "cookie";
import { Session } from "@contracts/constants";
import { verifySessionToken } from "./lib/jwt";
import { db } from "./lib/db";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // anonymous
  }
  return ctx;
}

// The session JWT carries only `sub` + `email`; everything else (notably `role`)
// is loaded fresh from the DB per request. That means a `users.role` change takes
// effect on the very next request — no re-login required — as long as we keep
// reading the user row here rather than trusting claims baked into the token.
type SessionPayload = { sub: string; email: string };

async function authenticateRequest(headers: Headers): Promise<User | undefined> {
  const raw = headers.get("cookie");
  if (!raw) return undefined;
  const token = parseCookie(raw)[Session.cookieName];
  if (!token) return undefined;

  let payload: SessionPayload;
  try {
    payload = verifySessionToken(token) as SessionPayload;
  } catch {
    return undefined;
  }

  const userId = Number(payload.sub);
  if (!Number.isFinite(userId)) return undefined;

  const user = await db.users.findById(userId);
  return user ?? undefined;
}