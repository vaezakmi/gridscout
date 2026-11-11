import {
  FIX_PACKAGE_META,
  fixPlanTotalKes,
  scoreBand,
  type FixPackageId,
  type ScoreBand,
} from "@contracts/grid";
import { fmtKes } from "@/lib/format";

export type SortMode = "leak" | "quickwin";

/** Gaps shown free before a lead is unlocked. */
export const FREE_GAPS = 2;

/**
 * WhatsApp number of your GridScout fulfilment desk, international format, digits only.
 * PLACEHOLDER: replace with your real number before shipping.
 */
export const FULFILMENT_WHATSAPP = "254700000000";

// Scan results don't carry detailed signals, so lists estimate the plan from the score band.
// The audit panel builds the exact plan from real signals via buildFixPlan().
const BAND_PLAN: Record<ScoreBand, readonly FixPackageId[]> = {
  invisible: ["claim_profile", "review_drive", "one_page_site"],
  weak: ["claim_profile", "review_drive"],
  strong: [],
};

export const bandPlan = (visibility: number): readonly FixPackageId[] => BAND_PLAN[scoreBand(visibility)];

/** Estimated value of the fix plan an agency could sell to this business (KES). */
export const fixValueKes = (visibility: number): number => fixPlanTotalKes(bandPlan(visibility));

export const fixPackageLabels = (visibility: number): string[] =>
  bandPlan(visibility).map((id) => FIX_PACKAGE_META[id].label);

/** Lower rank = easier win. Weak presence is cheaper to fix than invisible; strong comes last. */
export const quickWinRank = (visibility: number): number => {
  const band = scoreBand(visibility);
  if (band === "weak") return 0;
  if (band === "invisible") return 1;
  return 2;
};

type Rankable = { lostRevenueKes: number; scores: { visibility: number } };

/** Returns a new sorted array; never mutates the input. */
export function sortOpportunities<T extends Rankable>(rows: T[], mode: SortMode): T[] {
  const copy = [...rows];
  if (mode === "quickwin") {
    return copy.sort(
      (a, b) =>
        quickWinRank(a.scores.visibility) - quickWinRank(b.scores.visibility) ||
        b.lostRevenueKes - a.lostRevenueKes,
    );
  }
  return copy.sort((a, b) => b.lostRevenueKes - a.lostRevenueKes);
}

/** Plain-text quote an agency can send to the business owner. Built only from data already in the audit. */
export function buildQuoteText(
  b: { name: string; visibility: number; lostRevenueKes: number },
  plan: readonly FixPackageId[],
): string {
  const lines = plan.map((id) => `• ${FIX_PACKAGE_META[id].label}: ${fmtKes(FIX_PACKAGE_META[id].priceKes)}`);
  return [
    `Hello ${b.name} team,`,
    ``,
    `I reviewed your Google presence. Your visibility score is ${b.visibility}/100, and we estimate roughly ${fmtKes(b.lostRevenueKes)} a month is going to competitors.`,
    ``,
    `Here is what I recommend:`,
    ...lines,
    ``,
    `Total: ${fmtKes(fixPlanTotalKes(plan))} (one-off).`,
    `Happy to start this week. Shall I send the details?`,
  ].join("\n");
}

/** wa.me link that sends a fulfilment request to the GridScout desk. */
export function fulfilmentLink(
  b: { name: string; area: string; phone?: string; lostRevenueKes: number },
  plan: readonly FixPackageId[],
): string {
  const msg = [
    "GridScout fulfilment request",
    `Business: ${b.name} (${b.area})`,
    b.phone ? `Contact: ${b.phone}` : null,
    `Fixes wanted: ${plan.map((id) => FIX_PACKAGE_META[id].label).join(", ")}`,
    `Plan value: ${fmtKes(fixPlanTotalKes(plan))}`,
    `Monthly leak: ${fmtKes(b.lostRevenueKes)}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${FULFILMENT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV of scan results. Deliberately excludes phone, website and gap text so it can't bypass the paywall. */
export function toCsv(
  rows: Array<Rankable & { name: string; category: string; issues: string[] }>,
  categoryLabel: (category: string) => string,
): string {
  const header = ["Rank", "Business", "Category", "Visibility", "Leak KES/mo", "Gaps", "Est. fix value KES"];
  const lines = rows.map((r, i) =>
    [
      i + 1,
      r.name,
      categoryLabel(r.category),
      r.scores.visibility,
      r.lostRevenueKes,
      r.issues.length,
      fixValueKes(r.scores.visibility),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\n");
}

/** Triggers a browser download of a CSV string. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}