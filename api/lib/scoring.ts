import type { Business } from "../../db/schema";
import type {
  BusinessScanResult,
  ScoreBreakdown,
  CategoryName,
} from "@contracts/grid";
import { CATEGORY_META } from "@contracts/grid";

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * GridScout Visibility Engine.
 * Two pillars, weighted toward web presence (where the money leaks):
 *  - Maps Score (45%): Google Business Profile health
 *  - Web Score (55%): site, speed, mobile, metadata, keyword rank
 */
export function computeScores(b: Business): ScoreBreakdown {
  const claimedPts = b.claimed ? 25 : 0;
  const ratingPts = Math.round(((b.rating - 1) / 4) * 20);
  const reviewPts = Math.min(20, Math.round(b.reviewCount / 9));
  const photosPts = Math.min(10, Math.round(b.photos / 4));
  const postsPts = Math.min(10, Math.round(b.posts / 1.2));
  const respondsPts = b.respondsToReviews ? 15 : 0;
  const maps = clamp100(
    claimedPts + ratingPts + reviewPts + photosPts + postsPts + respondsPts
  );

  const hasSite = !!b.website;
  const sitePts = hasSite ? 30 : 0;
  const speedPts =
    hasSite && b.siteSpeed != null ? Math.round(b.siteSpeed * 0.3) : 0;
  const mobilePts = b.mobileOk ? 15 : 0;
  const metaPts = b.metaOk ? 10 : 0;
  const rankPts =
    b.keywordRank == null
      ? 0
      : b.keywordRank <= 3
        ? 15
        : b.keywordRank <= 10
          ? 12
          : b.keywordRank <= 20
            ? 8
            : 4;
  const web = clamp100(sitePts + speedPts + mobilePts + metaPts + rankPts);

  return { maps, web, visibility: Math.round(maps * 0.45 + web * 0.55) };
}

/** Monthly revenue the business fails to capture (KES). */
export function lostRevenue(b: Business, visibility: number): number {
  // best-in-class local capture is ~32% of category searches; visibility scales you toward it
  const captureShare = (visibility / 100) * 0.32;
  const missedClicks = Math.max(0, b.estSearches * (0.32 - captureShare));
  const raw = missedClicks * 0.07 * b.avgTicketKes; // 7% of searchers become customers
  return Math.round(raw / 100) * 100;
}

export function buildIssues(b: Business): string[] {
  const issues: string[] = [];
  const kw = CATEGORY_META[b.category as CategoryName]?.keyword ?? "near me";
  if (!b.claimed) issues.push("Google Business Profile unclaimed");
  if (!b.website) issues.push("No website — invisible outside Maps");
  if (b.website && b.keywordRank == null)
    issues.push(`Not ranking for "${kw}" (top 50)`);
  if (b.website && b.keywordRank != null && b.keywordRank > 10)
    issues.push(`Ranks #${b.keywordRank} for "${kw}"`);
  if (b.website && b.siteSpeed != null && b.siteSpeed < 55)
    issues.push(`Slow site (Lighthouse ${Math.round(b.siteSpeed)}/100)`);
  if (b.website && b.mobileOk === false)
    issues.push("Broken on mobile (72% of local searches)");
  if (b.website && b.metaOk === false)
    issues.push("Missing meta titles/descriptions");
  if (b.reviewCount < 20) issues.push(`Only ${b.reviewCount} reviews`);
  if (b.claimed && b.posts === 0) issues.push("Profile has zero posts");
  if (b.claimed && !b.respondsToReviews)
    issues.push("Never responds to reviews");
  return issues;
}

export function toScanResult(b: Business): BusinessScanResult {
  const scores = computeScores(b);
  return {
    id: b.id,
    name: b.name,
    category: b.category as CategoryName,
    area: b.area,
    lat: b.lat,
    lng: b.lng,
    rating: b.rating,
    reviewCount: b.reviewCount,
    website: b.website,
    scores,
    lostRevenueKes: lostRevenue(b, scores.visibility),
    estSearches: b.estSearches,
    issues: buildIssues(b),
  };
}

export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 10) / 10;
}
