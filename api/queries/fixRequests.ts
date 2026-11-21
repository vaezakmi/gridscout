import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import {
  leads,
  businesses,
  creditTxns,
  wallets,
  fixRequests,
} from "../../db/schema";
import {
  buildFixPlan,
  fixPlanTotalKes,
  type FixPackageId,
} from "../../contracts/grid";
import {
  FIX_REQUEST_CREDITS,
  FIX_NOTE_MAX,
  canTransitionFix,
  selectFromPlan,
  fixRequestRefundCredits,
  type FixRequestStatus,
} from "../../contracts/fixes";

// Re-usable select shape that joins the business into the lead
const leadWithBusiness = {
  lead: leads,
  business: businesses,
};

/**
 * Agency submits a new fix request for a lead they own.
 * Deducts credits, computes the plan, validates the selected packages,
 * and inserts the request.
 */
export async function submitFixRequest(
  userId: number,
  input: { leadId: number; packages: FixPackageId[]; note?: string },
) {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // 1. Find the lead (must be owned by this user)
    const rows = await tx
      .select(leadWithBusiness)
      .from(leads)
      .innerJoin(businesses, eq(leads.businessId, businesses.id))
      .where(and(eq(leads.id, input.leadId), eq(leads.userId, userId)))
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error("LEAD_NOT_FOUND");

    // 2. Compute the full plan based on the business's signals
    const plan = buildFixPlan(row.business);
    if (plan.length === 0) throw new Error("NOTHING_TO_FIX");

    // 3. Filter the requested packages to only those in the plan
    const selected =
      input.packages.length > 0 ? selectFromPlan(input.packages, plan) : plan;
    if (selected.length === 0) throw new Error("NO_VALID_PACKAGES");

    // 4. Charge the credit fee
    const walletRows = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    const wallet = walletRows[0];
    if (!wallet || wallet.credits < FIX_REQUEST_CREDITS) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    await tx
      .update(wallets)
      .set({ credits: sql`${wallets.credits} - ${FIX_REQUEST_CREDITS}` })
      .where(eq(wallets.userId, userId));

    // 5. Insert the request
    const note = input.note?.trim().slice(0, FIX_NOTE_MAX) || null;
    const [{ id: requestId }] = await tx
      .insert(fixRequests)
      .values({
        leadId: input.leadId,
        userId,
        packages: selected,
        totalKes: fixPlanTotalKes(selected),
        feeCredits: FIX_REQUEST_CREDITS,
        note,
        status: "new",
      })
      .$returningId();

    // 6. Log the credit transaction
    await tx.insert(creditTxns).values({
      userId,
      kind: "fix_request",
      credits: -FIX_REQUEST_CREDITS,
      amountKes: 0,
      status: "completed",
    });

    return { id: requestId, status: "new" as const, packages: selected };
  });
}

/**
 * Agency: list their own requests and statuses.
 */
export async function listMyFixRequests(userId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: fixRequests.id,
      leadId: fixRequests.leadId,
      status: fixRequests.status,
      packages: fixRequests.packages,
      totalKes: fixRequests.totalKes,
      feeCredits: fixRequests.feeCredits,
      quotedKes: fixRequests.quotedKes,
      note: fixRequests.note,
      createdAt: fixRequests.createdAt,
      business: {
        id: businesses.id,
        name: businesses.name,
        area: businesses.area,
      },
    })
    .from(fixRequests)
    .innerJoin(leads, eq(fixRequests.leadId, leads.id))
    .innerJoin(businesses, eq(leads.businessId, businesses.id))
    .where(eq(fixRequests.userId, userId))
    .orderBy(desc(fixRequests.createdAt));

  return rows;
}

/**
 * Admin: the desk. Lists all requests, optionally filtered by status.
 */
export async function adminListFixRequests(
  statuses?: readonly FixRequestStatus[],
) {
  const db = getDb();
  
  // Build base query
  const baseQuery = db
    .select({
      id: fixRequests.id,
      leadId: fixRequests.leadId,
      status: fixRequests.status,
      packages: fixRequests.packages,
      totalKes: fixRequests.totalKes,
      feeCredits: fixRequests.feeCredits,
      quotedKes: fixRequests.quotedKes,
      note: fixRequests.note,
      adminNote: fixRequests.adminNote,
      createdAt: fixRequests.createdAt,
      business: {
        id: businesses.id,
        name: businesses.name,
        area: businesses.area,
      },
    })
    .from(fixRequests)
    .innerJoin(leads, eq(fixRequests.leadId, leads.id))
    .innerJoin(businesses, eq(leads.businessId, businesses.id));

  // Apply status filter if provided
  const query = statuses && statuses.length > 0
    ? baseQuery.where(
        sql`${fixRequests.status} IN (${sql.join(statuses.map(s => sql`${s}`), sql`, `)})`
      )
    : baseQuery;

  return query.orderBy(desc(fixRequests.createdAt));
}

/**
 * Admin: update a request's status, quote, or admin note.
 * Handles refunds if the request is declined.
 */
export async function adminUpdateFixRequest(input: {
  id: number;
  status?: FixRequestStatus;
  quotedKes?: number;
  adminNote?: string;
}) {
  const db = getDb();

  return await db.transaction(async (tx) => {
    // 1. Find the request
    const rows = await tx
      .select()
      .from(fixRequests)
      .where(eq(fixRequests.id, input.id))
      .limit(1);

    const request = rows[0];
    if (!request) throw new Error("REQUEST_NOT_FOUND");

    // 2. If changing status, validate the transition
    if (input.status && input.status !== request.status) {
      if (!canTransitionFix(request.status, input.status)) {
        throw new Error("INVALID_TRANSITION");
      }
    }

    // 3. Refund credits if declined
    const refund = input.status ? fixRequestRefundCredits(input.status) : 0;
    if (refund > 0) {
      await tx
        .update(wallets)
        .set({ credits: sql`${wallets.credits} + ${refund}` })
        .where(eq(wallets.userId, request.userId));

      await tx.insert(creditTxns).values({
        userId: request.userId,
        kind: "refund",
        credits: refund,
        amountKes: 0,
        status: "completed",
      });
    }

    // 4. Update the request
    await tx
      .update(fixRequests)
      .set({
        ...(input.status ? { status: input.status } : {}),
        ...(input.quotedKes !== undefined
          ? { quotedKes: input.quotedKes }
          : {}),
        ...(input.adminNote !== undefined
          ? { adminNote: input.adminNote }
          : {}),
      })
      .where(eq(fixRequests.id, input.id));

    return { ok: true };
  });
}