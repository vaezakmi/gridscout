import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { businesses, leads } from "../db/schema";
import {
  AREA_LIST,
  AREA_META,
  CATEGORY_LIST,
  SCAN_MAX_RESULTS,
  SCORE_BANDS,
  type AreaSummary,
  type AuditDetail,
} from "@contracts/grid";
import { toScanResult, computeScores, lostRevenue, haversineKm } from "./lib/scoring";

export const gridRouter = createRouter({
  // Areas + business counts for the scan console
  areas: publicQuery.query(async (): Promise<AreaSummary[]> => {
    const db = getDb();
    const rows = await db
      .select({ area: businesses.area, n: sql<number>`count(*)` })
      .from(businesses)
      .groupBy(businesses.area);
    const counts = new Map(rows.map((r) => [r.area, Number(r.n)]));

    return AREA_LIST.map((name) => {
      const meta = AREA_META[name];
      return {
        name,
        region: meta.region,
        center: meta.center,
        zoom: meta.zoom,
        businesses: counts.get(name) ?? 0,
      };
    });
  }),

  // Headline stats for the landing ticker
  stats: publicQuery.query(async () => {
    const db = getDb();
    const all = await db.select().from(businesses);

    let invisible = 0;
    let totalLost = 0;
    let visibilitySum = 0;

    for (const b of all) {
      const v = computeScores(b).visibility;
      visibilitySum += v;
      if (v < SCORE_BANDS.invisibleBelow) invisible++;
      totalLost += lostRevenue(b, v);
    }

    return {
      businessesIndexed: all.length,
      invisibleCount: invisible,
      totalLostRevenueKes: totalLost,
      avgVisibility: all.length === 0 ? 0 : Math.round(visibilitySum / all.length),
    };
  }),

  // The core scan: businesses in an area (+ optional category), ranked by opportunity
  scan: publicQuery
    .input(
      z.object({
        area: z.enum(AREA_LIST),
        category: z.enum(CATEGORY_LIST).optional(),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(businesses)
        .where(
          input.category
            ? and(
                eq(businesses.area, input.area),
                eq(businesses.category, input.category),
              )
            : eq(businesses.area, input.area),
        );

      return rows
        .map(toScanResult)
        .sort((a, b) => b.lostRevenueKes - a.lostRevenueKes)
        .slice(0, SCAN_MAX_RESULTS);
    }),

  // Full audit for one business + competitor radius + viewer's lead status
  audit: publicQuery
    .input(z.object({ businessId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, input.businessId))
        .limit(1);
      const b = row[0];
      if (!b) return null;

      // competitors: same category in the same area, sorted by visibility
      const peers = await db
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.area, b.area),
            eq(businesses.category, b.category),
          ),
        );

      const competitors = peers
        .filter((p) => p.id !== b.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          visibilityScore: computeScores(p).visibility,
          distanceKm: Math.round(haversineKm(b.lat, b.lng, p.lat, p.lng) * 100) / 100,
          reviewCount: p.reviewCount,
          keywordRank: p.keywordRank,
        }))
        .sort((x, y) => y.visibilityScore - x.visibilityScore)
        .slice(0, 5);

      let leadStatus: AuditDetail["leadStatus"] = null;
      let leadId: number | null = null;
      let pitch: string | null = null;
      if (ctx.user) {
        const mine = await db
          .select()
          .from(leads)
          .where(and(eq(leads.userId, ctx.user.id), eq(leads.businessId, b.id)))
          .limit(1);
        if (mine[0]) {
          leadStatus = mine[0].status;
          leadId = mine[0].id;
          pitch = mine[0].pitch ?? null;
        }
      }

      return {
        ...toScanResult(b),
        phone: b.phone,
        pitch,
        claimed: b.claimed,
        photos: b.photos,
        posts: b.posts,
        respondsToReviews: b.respondsToReviews,
        keywordRank: b.keywordRank,
        siteSpeed: b.siteSpeed,
        mobileOk: b.mobileOk,
        metaOk: b.metaOk,
        avgTicketKes: b.avgTicketKes,
        competitors,
        leadStatus,
        leadId,
      } satisfies AuditDetail;
    }),
});