// contracts/fixes.ts
// Server-side gap gating + paid fix requests.
// Pure data + types + tiny helpers. No runtime deps beyond ./grid, safe to import anywhere.

import {
  buildFixPlan,
  fixPlanTotalKes,
  type AuditDetail,
  type BusinessScanResult,
  type FixPackageId,
  type Tone,
} from "./grid";

/* ───────────────────────────────── GAP GATING ───────────────────────────────── */
// Locked businesses expose only their top gaps. The server applies these before
// anything leaves the API, so the hidden detail never reaches the browser.

export const FREE_GAPS = 2;

export interface GatedScanResult extends BusinessScanResult {
  /** True number of gaps found; `issues` holds at most FREE_GAPS of them. */
  gapCount: number;
}

export interface GatedAuditDetail extends AuditDetail {
  gapCount: number;
  /** Computed server-side from real signals, so the locked teaser total is still exact. */
  fixPlan: FixPackageId[];
}

/** Scan rows: free preview of the top gaps plus the real count. */
export const gateScanResult = (r: BusinessScanResult): GatedScanResult => ({
  ...r,
  issues: r.issues.slice(0, FREE_GAPS),
  gapCount: r.issues.length,
});

/**
 * Audit detail. Unlocked leads (or `forceUnlocked`, e.g. admins) get everything.
 * Locked ones keep scores, leak, competitors and the top gaps; the signals, contact,
 * pitch and remaining gaps are neutralised before they leave the server.
 */
export function gateAudit(audit: AuditDetail, forceUnlocked = false): GatedAuditDetail {
  const fixPlan = buildFixPlan(audit); // always from the real signals
  const gapCount = audit.issues.length;
  const unlocked = forceUnlocked || audit.leadStatus !== null;
  if (unlocked) return { ...audit, gapCount, fixPlan };

  return {
    ...audit,
    issues: audit.issues.slice(0, FREE_GAPS),
    gapCount,
    fixPlan,
    // contact + pitch
    phone: "",
    pitch: null,
    // "on record" is all a locked client needs; the real URL is part of the contact
    website: audit.website ? "redacted" : null,
    // profile signals (the detail behind the hidden gaps)
    claimed: false,
    photos: 0,
    posts: 0,
    respondsToReviews: false,
    siteSpeed: null,
    mobileOk: null,
    metaOk: null,
  };
}

/* ──────────────────────────────── FIX REQUESTS ───────────────────────────────── */
// An agency pays a request fee in credits to have GridScout deliver a lead's fix plan.

export const FIX_REQUEST_CREDITS = 2; // starting point; tune against your delivery cost
export const FIX_NOTE_MAX = 500;

export const FIX_REQUEST_STATUS_LIST = [
  "new",
  "quoted",
  "in_progress",
  "delivered",
  "declined",
  "cancelled",
] as const;
export type FixRequestStatus = (typeof FIX_REQUEST_STATUS_LIST)[number];

export const FIX_REQUEST_STATUS_META: Record<
  FixRequestStatus,
  { label: string; tone: Tone; next: readonly FixRequestStatus[] }
> = {
  new:         { label: "New",         tone: "neutral", next: ["quoted", "declined", "cancelled"] },
  quoted:      { label: "Quoted",      tone: "primary", next: ["in_progress", "declined", "cancelled"] },
  in_progress: { label: "In progress", tone: "amber",   next: ["delivered", "cancelled"] },
  delivered:   { label: "Delivered",   tone: "mint",    next: [] },
  declined:    { label: "Declined",    tone: "red",     next: [] },
  cancelled:   { label: "Cancelled",   tone: "red",     next: [] },
};

export const canTransitionFix = (from: FixRequestStatus, to: FixRequestStatus) =>
  FIX_REQUEST_STATUS_META[from].next.includes(to);

/**
 * Credits handed back for a status. Only a decline by GridScout refunds the fee;
 * a request the agency cancels after it was quoted does not.
 */
export const fixRequestRefundCredits = (status: FixRequestStatus): number =>
  status === "declined" ? FIX_REQUEST_CREDITS : 0;

/**
 * Keeps only packages that are really part of the business's plan, de-duplicated,
 * in plan order. Never trust the client's list: compute `plan` on the server.
 */
export function selectFromPlan(
  selected: readonly FixPackageId[],
  plan: readonly FixPackageId[],
): FixPackageId[] {
  const wanted = new Set(selected);
  return plan.filter((id) => wanted.has(id));
}

export const fixSelectionTotalKes = (selection: readonly FixPackageId[]) => fixPlanTotalKes(selection);

export interface RequestFixInput {
  leadId: number;
  packages: FixPackageId[]; // subset of the plan; empty = the whole plan
  note?: string;            // trimmed and capped to FIX_NOTE_MAX server-side
}

export interface FixRequestDto {
  id: number;
  leadId: number;
  status: FixRequestStatus;
  packages: FixPackageId[];
  totalKes: number;         // list price of the selected packages
  feeCredits: number;       // what the agency paid to submit
  quotedKes: number | null; // GridScout's wholesale quote, once given
  note: string | null;
  createdAt: Date;
  business: Pick<BusinessScanResult, "id" | "name" | "area">;
}