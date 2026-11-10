import * as cookie from "cookie";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { signupInput, signinInput, forgotPasswordInput } from "@contracts/auth";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { db } from "./lib/db";
import { signSessionToken } from "./lib/jwt";
import { env } from "./lib/env";

const BCRYPT_ROUNDS = 12;

function writeSessionCookie(
  ctx: { resHeaders: Headers; req: { headers: any } },
  token: string,
) {
  const opts = getSessionCookieOptions(ctx.req.headers);
  ctx.resHeaders.append(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: opts.httpOnly,
      path: opts.path,
      sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
      secure: opts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );
}

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),

  signup: publicQuery.input(signupInput).mutation(async ({ input, ctx }) => {
    const existing = await db.users.findByEmail(input.email);
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
    }
    const user = await db.users.create({
      email: input.email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      provider: "email",
      providerId: null,
      role: input.email === env.ownerEmail ? "admin" : "user",
    });
    writeSessionCookie(ctx, signSessionToken({ sub: String(user.id), email: user.email }));
    return { user: { id: user.id, email: user.email, name: user.name } };
  }),

  signin: publicQuery.input(signinInput).mutation(async ({ input, ctx }) => {
    const user = await db.users.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    writeSessionCookie(ctx, signSessionToken({ sub: String(user.id), email: user.email }));
    return { user: { id: user.id, email: user.email, name: user.name } };
  }),

  forgotPassword: publicQuery.input(forgotPasswordInput).mutation(async ({ input }) => {
    const user = await db.users.findByEmail(input.email);
    if (user) {
      // TODO: generate token, store hash w/ expiry, email link
    }
    return { success: true };
  }),
});