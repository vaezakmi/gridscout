import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { FIX_PACKAGE_META, type FixPackageId } from "../contracts/grid";
import { FIX_NOTE_MAX, FIX_REQUEST_STATUS_LIST } from "../contracts/fixes";
import {
  adminListFixRequests,
  adminUpdateFixRequest,
  listMyFixRequests,
  submitFixRequest,
} from "./queries/fixRequests";

const PACKAGE_IDS = Object.keys(FIX_PACKAGE_META) as [FixPackageId, ...FixPackageId[]];

// Stable error codes thrown by the query layer -> tRPC codes. The message stays the code,
// so the client can detect INSUFFICIENT_CREDITS the same way it does for unlock.
const FIX_ERRORS: Record<string, TRPCError["code"]> = {
  INSUFFICIENT_CREDITS: "PRECONDITION_FAILED",
  LEAD_NOT_FOUND: "NOT_FOUND",
  REQUEST_NOT_FOUND: "NOT_FOUND",
  NOTHING_TO_FIX: "BAD_REQUEST",
  NO_VALID_PACKAGES: "BAD_REQUEST",
  REQUEST_ALREADY_OPEN: "CONFLICT",
  INVALID_TRANSITION: "BAD_REQUEST",
  QUOTE_REQUIRED: "BAD_REQUEST",
};

function rethrow(e: unknown): never {
  if (e instanceof Error && e.message in FIX_ERRORS) {
    throw new TRPCError({ code: FIX_ERRORS[e.message], message: e.message });
  }
  throw e;
}

export const fixesRouter = createRouter({
  // Agency: pay the credit fee and submit a done-for-you request for an unlocked lead
  request: authedQuery
    .input(
      z.object({
        leadId: z.number().int().positive(),
        packages: z.array(z.enum(PACKAGE_IDS)).max(PACKAGE_IDS.length).default([]),
        note: z.string().max(FIX_NOTE_MAX).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitFixRequest(ctx.user.id, input);
      } catch (e) {
        rethrow(e);
      }
    }),

  // Agency: their own requests and statuses
  mine: authedQuery.query(({ ctx }) => listMyFixRequests(ctx.user.id)),

  // Admin (you): the desk
  adminList: adminQuery
    .input(z.object({ statuses: z.array(z.enum(FIX_REQUEST_STATUS_LIST)).optional() }).optional())
    .query(({ input }) => adminListFixRequests(input?.statuses)),

  adminUpdate: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(FIX_REQUEST_STATUS_LIST).optional(),
        quotedKes: z.number().int().positive().max(10_000_000).optional(),
        adminNote: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await adminUpdateFixRequest(input);
      } catch (e) {
        rethrow(e);
      }
    }),
});