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

async function authenticateRequest(headers: Headers): Promise<User | undefined> {
  const raw = headers.get("cookie");
  if (!raw) return undefined;
  const token = parseCookie(raw)[Session.cookieName];
  if (!token) return undefined;
  let payload: { sub: string; email: string };
  try {
    payload = verifySessionToken(token);
  } catch {
    return undefined;
  }
  const user = await db.users.findById(Number(payload.sub));
  return user ?? undefined;
}