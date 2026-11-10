import {
  FIX_PACKAGE_META,
  fixPlanTotalKes,
  scoreBand,
  type FixPackageId,
  type ScoreBand,
} from "@contracts/grid";

export type SortMode = "leak" | "quickwin";

// Scan results don't carry the detailed signals, so the dashboard estimates the plan from the score band.
// The audit panel builds the exact plan from real signals via buildFixPlan().
const BAND_PLAN: Record<ScoreBand, readonly FixPackageId[]> = {
  invisible: ["claim_profile", "review_drive", "one_page_site"],
  weak: ["claim_profile", "review_drive"],
  strong: [],
};

/** Estimated value of the fix plan an agency could sell to this business (KES). */
export const fixValueKes = (visibility: number): number => fixPlanTotalKes(BAND_PLAN[scoreBand(visibility)]);

/** Names of the packages behind the estimate, for tooltips or exports. */
export const fixPackageLabels = (visibility: number): string[] =>
  BAND_PLAN[scoreBand(visibility)].map((id) => FIX_PACKAGE_META[id].label);

/**
 * Lower rank = easier win. "Weak" businesses already have some presence, so they
 * are cheaper and faster to fix than "invisible" ones; "strong" ones come last.
 */
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

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/**
 * Builds a CSV of scan results. Deliberately excludes phone and website so an
 * export can't bypass the lead-credit paywall.
 */
export function toCsv(
  rows: Array<Rankable & { name: string; category: string; issues: string[] }>,
  categoryLabel: (category: string) => string,
): string {
  const header = ["Rank", "Business", "Category", "Visibility", "Leak KES/mo", "Est. fix value KES", "Top issue"];
  const lines = rows.map((r, i) =>
    [
      i + 1,
      r.name,
      categoryLabel(r.category),
      r.scores.visibility,
      r.lostRevenueKes,
      fixValueKes(r.scores.visibility),
      r.issues[0] ?? "",
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