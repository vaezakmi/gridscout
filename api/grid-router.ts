import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { businesses, leads } from "../db/schema";
import { AREA_LIST, CATEGORY_LIST, type AuditDetail } from "@contracts/grid";
import { toScanResult, computeScores, lostRevenue, haversineKm } from "./lib/scoring";

export const gridRouter = createRouter({
  // Areas + business counts for the scan console
  areas: publicQuery.query(async () => {
    const db = getDb();
    const all = await db
      .select({ area: businesses.area, id: businesses.id })
      .from(businesses);
    const counts = new Map<string, number>();
    for (const row of all) {
      counts.set(row.area, (counts.get(row.area) ?? 0) + 1);
    }
    return AREA_LIST.map((name) => ({
      name,
      businesses: counts.get(name) ?? 0,
      center: AREA_CENTERS[name],
    }));
  }),

  // Headline stats for the landing ticker
  stats: publicQuery.query(async () => {
    const db = getDb();
    const all = await db.select().from(businesses);
    let invisible = 0;
    let totalLost = 0;
    for (const b of all) {
      const v = computeScores(b).visibility;
      if (v < 40) invisible++;
      totalLost += lostRevenue(b, v);
    }
    return {
      businessesIndexed: all.length,
      invisibleCount: invisible,
      totalLostRevenueKes: totalLost,
      avgVisibility:
        all.length === 0
          ? 0
          : Math.round(
              all.reduce((s, b) => s + computeScores(b).visibility, 0) /
                all.length
            ),
    };
  }),

  // The core scan: businesses in an area (+ optional category), ranked by opportunity
  scan: publicQuery
    .input(
      z.object({
        area: z.string(),
        category: z.enum(CATEGORY_LIST).optional(),
      })
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
                eq(businesses.category, input.category)
              )
            : eq(businesses.area, input.area)
        );
      return rows
        .map(toScanResult)
        .sort((a, b) => b.lostRevenueKes - a.lostRevenueKes);
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
            eq(businesses.category, b.category)
          )
        );
      const competitors = peers
        .filter((p) => p.id !== b.id)
        .map((p) => ({
          id: p.id,
          name: p.name,
          visibilityScore: computeScores(p).visibility,
          distanceKm: haversineKm(b.lat, b.lng, p.lat, p.lng),
          reviewCount: p.reviewCount,
          keywordRank: p.keywordRank,
        }))
        .sort((x, y) => y.visibilityScore - x.visibilityScore)
        .slice(0, 5);

      let leadStatus: AuditDetail["leadStatus"] = null;
      let leadId: number | null = null;
      if (ctx.user) {
        const mine = await db
          .select()
          .from(leads)
          .where(
            and(eq(leads.userId, ctx.user.id), eq(leads.businessId, b.id))
          )
          .limit(1);
        if (mine[0]) {
          leadStatus = mine[0].status;
          leadId = mine[0].id;
        }
      }

      const scan = toScanResult(b);
      return {
        ...scan,
        phone: b.phone,
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

const AREA_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Nairobi CBD": { lat: -1.2864, lng: 36.8172 },
  Westlands: { lat: -1.2635, lng: 36.8023 },
  Kilimani: { lat: -1.292, lng: 36.787 },
  Karen: { lat: -1.3192, lng: 36.7058 },
  "Nakuru CBD": { lat: -0.3031, lng: 36.08 },
};
