import { z } from "zod";
import { eq, and, desc, sql, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { businesses, leads, wallets, creditTxns } from "../db/schema";
import { toScanResult } from "./lib/scoring";
import { generatePitch } from "./ai/pitch";
import { LEAD_STATUS_LIST } from "@contracts/grid";

async function ensureWallet(userId: number) {
  const db = getDb();
  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0];
  // First session: grant one free lead credit so the unlock flow can be experienced
  await db.insert(wallets).values({ userId, credits: 1 });
  await db.insert(creditTxns).values({
    userId,
    kind: "bonus",
    credits: 1,
    amountKes: 0,
  });
  const created = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .limit(1);
  return created[0];
}

export const leadsRouter = createRouter({
  // Agency pipeline
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({ lead: leads, business: businesses })
      .from(leads)
      .innerJoin(businesses, eq(leads.businessId, businesses.id))
      .where(eq(leads.userId, ctx.user.id))
      .orderBy(desc(leads.createdAt));
    return rows.map(({ lead, business }) => ({
      id: lead.id,
      status: lead.status,
      notes: lead.notes,
      pitch: lead.pitch,
      createdAt: lead.createdAt,
      business: { ...toScanResult(business), phone: business.phone },
    }));
  }),

  // Spend 1 credit -> unlock full contact details + AI pitch eligibility
  unlock: authedQuery
    .input(z.object({ businessId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const biz = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, input.businessId))
        .limit(1);
      if (!biz[0]) throw new TRPCError({ code: "NOT_FOUND" });

      // Ensure the wallet + free-credit bonus exist BEFORE the transaction, so
      // a rolled-back unlock doesn't leave an orphan wallet or lose the bonus.
      await ensureWallet(ctx.user.id);

      return await db.transaction(async (tx) => {
        const already = await tx
          .select()
          .from(leads)
          .where(
            and(
              eq(leads.userId, ctx.user.id),
              eq(leads.businessId, input.businessId),
            ),
          )
          .limit(1);
        if (already[0]) {
          return { leadId: already[0].id, alreadyUnlocked: true };
        }

        // Atomic decrement with balance check in the WHERE clause. `gte` in the
        // predicate means the UPDATE matches 0 rows when the balance is 0 —
        // no window between "check" and "update" for a concurrent unlock to
        // slip through.
        const decResult = await tx
          .update(wallets)
          .set({ credits: sql`${wallets.credits} - 1` })
          .where(
            and(eq(wallets.userId, ctx.user.id), gte(wallets.credits, 1)),
          );

        const affected =
          (decResult as unknown as { affectedRows?: number }[])[0]
            ?.affectedRows ?? 0;
        if (affected === 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "INSUFFICIENT_CREDITS",
          });
        }

        await tx.insert(creditTxns).values({
          userId: ctx.user.id,
          kind: "unlock",
          credits: -1,
          amountKes: 0,
        });

        const [{ id: leadId }] = await tx
          .insert(leads)
          .values({ userId: ctx.user.id, businessId: input.businessId })
          .$returningId();
        return { leadId, alreadyUnlocked: false };
      });
    }),

  setStatus: authedQuery
    .input(
      z.object({
        leadId: z.number().int().positive(),
        status: z.enum(LEAD_STATUS_LIST),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const owned = await db
        .select()
        .from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.user.id)))
        .limit(1);
      if (!owned[0]) throw new TRPCError({ code: "NOT_FOUND" });
      await db
        .update(leads)
        .set({
          status: input.status,
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        })
        .where(eq(leads.id, input.leadId));
      return { ok: true };
    }),

  // AI-generated pitch email for an unlocked lead
  generatePitch: authedQuery
    .input(z.object({ leadId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db
        .select({ lead: leads, business: businesses })
        .from(leads)
        .innerJoin(businesses, eq(leads.businessId, businesses.id))
        .where(and(eq(leads.id, input.leadId), eq(leads.userId, ctx.user.id)))
        .limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const { lead, business } = row[0];

      const scan = toScanResult(business);
      const result = await generatePitch({
        ...scan,
        phone: business.phone,
        claimed: business.claimed,
        photos: business.photos,
        posts: business.posts,
        respondsToReviews: business.respondsToReviews,
        keywordRank: business.keywordRank,
        siteSpeed: business.siteSpeed,
        mobileOk: business.mobileOk,
        metaOk: business.metaOk,
        avgTicketKes: business.avgTicketKes,
        competitors: [], // TODO: hydrate from grid.audit's competitor query
        leadStatus: lead.status,
        leadId: lead.id,
      });

      if (result.pitch) {
        await db
          .update(leads)
          .set({ pitch: result.pitch })
          .where(eq(leads.id, lead.id));
      }
      return result;
    }),
});

export { ensureWallet };