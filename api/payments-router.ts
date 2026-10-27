import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wallets, creditTxns } from "../db/schema";
import { ensureWallet } from "./leads-router";
import { CREDIT_PRICE_KES, CREDIT_BUNDLES } from "@contracts/grid";

/**
 * M-Pesa (Safaricom Daraja) integration.
 *
 * DEMO MODE: when DARAJA_CONSUMER_KEY / DARAJA_CONSUMER_SECRET are not set,
 * the STK push is simulated end-to-end: initiate() creates a pending txn and
 * the client confirms it via confirmDemo(), mirroring the real
 * CustomerBuyGoodsOnline flow. To go live: add the Daraja credentials to the
 * environment, implement the oauth token + STK push POST in
 * api/routes/payments.ts (route /api/payments/daraja/callback is already the
 * confirmation webhook), and flip confirmDemo off.
 */
export const paymentsRouter = createRouter({
  wallet: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const wallet = await ensureWallet(ctx.user.id);
    const txns = await db
      .select()
      .from(creditTxns)
      .where(eq(creditTxns.userId, ctx.user.id))
      .orderBy(desc(creditTxns.createdAt))
      .limit(20);
    return {
      credits: wallet.credits,
      transactions: txns.map((t) => ({
        id: t.id,
        kind: t.kind,
        credits: t.credits,
        amountKes: t.amountKes,
        status: t.status,
        mpesaRef: t.mpesaRef,
        createdAt: t.createdAt,
      })),
    };
  }),

  // Price quote for the checkout sheet
  quote: authedQuery
    .input(z.object({ credits: z.number().int() }))
    .query(({ input }) => ({
      credits: input.credits,
      amountKes: input.credits * CREDIT_PRICE_KES,
      pricePerCredit: CREDIT_PRICE_KES,
      bundles: CREDIT_BUNDLES,
    })),

  // Initiate STK push (demo-simulated until Daraja credentials are configured)
  initiate: authedQuery
    .input(
      z.object({
        credits: z.number().int(),
        phone: z
          .string()
          .regex(/^(\+254|0)7\d{8}$/, "Enter a valid Safaricom number, e.g. 0712345678"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!CREDIT_BUNDLES.includes(input.credits as (typeof CREDIT_BUNDLES)[number])) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Credits must be one of: " + CREDIT_BUNDLES.join(", "),
        });
      }
      const db = getDb();
      await ensureWallet(ctx.user.id);
      const amountKes = input.credits * CREDIT_PRICE_KES;
      const inserted = await db.insert(creditTxns).values({
        userId: ctx.user.id,
        kind: "purchase",
        credits: input.credits,
        amountKes,
        status: "pending",
        mpesaRef: null,
      });
      const txnId = Number(inserted[0].insertId);
      const demo = !process.env.DARAJA_CONSUMER_KEY;
      return {
        txnId,
        amountKes,
        phone: input.phone,
        demo,
        message: demo
          ? `STK push simulated for ${input.phone}. In production this triggers a real M-Pesa prompt.`
          : "STK push sent — check the handset.",
      };
    }),

  // Demo-mode confirmation (stands in for the Daraja callback webhook)
  confirmDemo: authedQuery
    .input(z.object({ txnId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const txn = await db
        .select()
        .from(creditTxns)
        .where(eq(creditTxns.id, input.txnId))
        .limit(1);
      const t = txn[0];
      if (!t || t.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND" });
      if (t.status !== "pending") return { ok: true, already: true };

      const demo = !process.env.DARAJA_CONSUMER_KEY;
      if (!demo) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Live mode: payment is confirmed by the Daraja callback webhook.",
        });
      }
      const mpesaRef = "DEMO" + Math.random().toString(36).slice(2, 10).toUpperCase();
      await db
        .update(creditTxns)
        .set({ status: "completed", mpesaRef })
        .where(eq(creditTxns.id, t.id));
      const wallet = await ensureWallet(ctx.user.id);
      await db
        .update(wallets)
        .set({ credits: wallet.credits + t.credits })
        .where(eq(wallets.userId, ctx.user.id));
      return { ok: true, already: false, mpesaRef };
    }),
});
