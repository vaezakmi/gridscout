
// contracts/fixes.ts
// Server-side gap gating + free Service Desk submissions.
// Pure data + types + tiny helpers. No runtime deps beyond ./grid,
// safe to import anywhere.

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
// anything leaves the API, so hidden details never reach the browser.

export const FREE_GAPS = 2;

export interface GatedScanResult extends BusinessScanResult {
  /** True number of gaps found; issues holds at most FREE_GAPS of them. */
  gapCount: number;
}

export interface GatedAuditDetail extends AuditDetail {
  gapCount: number;
  /** Computed server-side from real signals, so the locked teaser total is exact. */
  fixPlan: FixPackageId[];
}

/** Scan rows: free preview of the top gaps plus the real count. */
export const gateScanResult = (r: BusinessScanResult): GatedScanResult => ({
  ...r,
  issues: r.issues.slice(0, FREE_GAPS),
  gapCount: r.issues.length,
});

/**
 * Audit detail. Unlocked leads (or forceUnlocked, e.g. admins) get everything.
 * Locked ones keep scores, leak, competitors and the top gaps; the signals,
 * contact, pitch and remaining gaps are neutralised before they leave the API.
 */
export function gateAudit(
  audit: AuditDetail,
  forceUnlocked = false,
): GatedAuditDetail {
  const fixPlan = buildFixPlan(audit);
  const gapCount = audit.issues.length;
  const unlocked = forceUnlocked || audit.leadStatus !== null;

  if (unlocked) {
    return { ...audit, gapCount, fixPlan };
  }

  return {
    ...audit,
    issues: audit.issues.slice(0, FREE_GAPS),
    gapCount,
    fixPlan,

    // Contact and pitch.
    phone: "",
    pitch: null,
    website: audit.website ? "redacted" : null,

    // Profile signals behind the hidden gaps.
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

// Customers submit requests for free. GRIDSCOUT reviews, quotes and fulfils
// approved work after payment has been verified.

export const FIX_REQUEST_CREDITS = 2; // Retained for historical paid requests.
export const FIX_NOTE_MAX = 500;

export const FIX_REQUEST_STATUS_LIST = [
  "new",
  "quoted",
  "in_progress",
  "delivered",
  "declined",
  "cancelled",
] as const;

export type FixRequestStatus =
  (typeof FIX_REQUEST_STATUS_LIST)[number];

export const FIX_REQUEST_STATUS_META: Record<
  FixRequestStatus,
  {
    label: string;
    tone: Tone;
    next: readonly FixRequestStatus[];
  }
> = {
  new: {
    label: "New",
    tone: "neutral",
    next: ["quoted", "declined", "cancelled"],
  },
  quoted: {
    label: "Quoted",
    tone: "primary",
    next: ["in_progress", "declined", "cancelled"],
  },
  in_progress: {
    label: "In progress",
    tone: "amber",
    next: ["delivered", "cancelled"],
  },
  delivered: {
    label: "Delivered",
    tone: "mint",
    next: [],
  },
  declined: {
    label: "Declined",
    tone: "red",
    next: [],
  },
  cancelled: {
    label: "Cancelled",
    tone: "red",
    next: [],
  },
};

export const canTransitionFix = (
  from: FixRequestStatus,
  to: FixRequestStatus,
): boolean => FIX_REQUEST_STATUS_META[from].next.includes(to);

/**
 * Returns the actual credits to refund.
 *
 * New Service Desk requests have feeCredits = 0, so they cannot
 * generate a credit refund. Historical paid requests retain their
 * recorded fee and can still be refunded when declined.
 */
export const fixRequestRefundCredits = (
  status: FixRequestStatus,
  feeCredits = 0,
): number => (status === "declined" ? Math.max(0, feeCredits) : 0);

/**
 * Keeps only packages that are really part of the business's plan,
 * de-duplicated and in plan order.
 *
 * Never trust the client's list: compute the plan on the server.
 */
export function selectFromPlan(
  selected: readonly FixPackageId[],
  plan: readonly FixPackageId[],
): FixPackageId[] {
  const wanted = new Set(selected);
  return plan.filter((id) => wanted.has(id));
}

export const fixSelectionTotalKes = (
  selection: readonly FixPackageId[],
): number => fixPlanTotalKes(selection);

export interface RequestFixInput {
  leadId: number;
  packages: FixPackageId[]; // Subset of plan; empty means the whole plan.
  note?: string; // Trimmed and capped to FIX_NOTE_MAX server-side.
}

export interface FixRequestDto {
  id: number;
  leadId: number;
  status: FixRequestStatus;
  packages: FixPackageId[];
  totalKes: number; // List price of selected packages.
  feeCredits: number; // Actual historical submission fee; zero for new requests.
  quotedKes: number | null; // GRIDSCOUT quotation, once provided.
  note: string | null;
  createdAt: Date;
  business: Pick<BusinessScanResult, "id" | "name" | "area">;
}
