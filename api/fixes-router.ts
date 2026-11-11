import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { FIX_PACKAGE_META, type FixPackageId } from "../contracts/grid";
import { FIX_NOTE_MAX, FIX_REQUEST_STATUS_LIST } from "../contracts/fixes";
import {
  acceptMyFixQuote,
  declineMyFixQuote,
  adminListFixRequests,
  adminUpdateFixRequest,
  listMyFixRequests,
  submitFixRequest,
} from "./queries/fixRequests";

const PACKAGE_IDS = Object.keys(FIX_PACKAGE_META) as [
  FixPackageId,
  ...FixPackageId[],
];

const FIX_ERRORS: Record<string, TRPCError["code"]> = {
  LEAD_NOT_FOUND: "NOT_FOUND",
  REQUEST_NOT_FOUND: "NOT_FOUND",
  NOTHING_TO_FIX: "BAD_REQUEST",
  NO_VALID_PACKAGES: "BAD_REQUEST",
  REQUEST_ALREADY_OPEN: "CONFLICT",
  INVALID_TRANSITION: "BAD_REQUEST",
  AGENCY_ACCEPTANCE_REQUIRED: "FORBIDDEN",
  QUOTE_REQUIRED: "BAD_REQUEST",
};

function rethrow(error: unknown): never {
  if (error instanceof Error && error.message in FIX_ERRORS) {
    throw new TRPCError({
      code: FIX_ERRORS[error.message],
      message: error.message,
    });
  }

  throw error;
}

export const fixesRouter = createRouter({
  request: authedQuery
    .input(
      z.object({
        leadId: z.number().int().positive(),
        packages: z.array(z.enum(PACKAGE_IDS))
          .max(PACKAGE_IDS.length)
          .default([])
          .refine(
            (packages) => new Set(packages).size === packages.length,
            { message: "Duplicate packages are not allowed" },
          ),
        note: z.string().max(FIX_NOTE_MAX).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitFixRequest(ctx.user.id, input);
      } catch (error) {
        rethrow(error);
      }
    }),

  acceptQuote: authedQuery
    .input(z.object({
      requestId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await acceptMyFixQuote(ctx.user.id, input.requestId);
      } catch (error) {
        rethrow(error);
      }
    }),
  declineQuote: authedQuery
    .input(z.object({
      requestId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await declineMyFixQuote(ctx.user.id, input.requestId);
      } catch (error) {
        rethrow(error);
      }
    }),
  mine: authedQuery.query(({ ctx }) =>
    listMyFixRequests(ctx.user.id),
  ),

  adminList: adminQuery
    .input(
      z.object({
        statuses: z.array(z.enum(FIX_REQUEST_STATUS_LIST)).optional(),
      }).optional(),
    )
    .query(({ input }) =>
      adminListFixRequests(input?.statuses),
    ),

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
      } catch (error) {
        rethrow(error);
      }
    }),
});