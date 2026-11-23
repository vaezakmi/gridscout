
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
  FIX_NOTE_MAX,
  canTransitionFix,
  selectFromPlan,
  type FixRequestStatus,
} from "../../contracts/fixes";

const leadWithBusiness = {
  lead: leads,
  business: businesses,
};

/**
 * Customer submits a free Service Desk request for a lead they own.
 * GRIDSCOUT reviews the request and sends a quotation separately.
 */
export async function submitFixRequest(
  userId: number,
  input: { leadId: number; packages: FixPackageId[]; note?: string },
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    // Verify lead ownership.
    const rows = await tx
      .select(leadWithBusiness)
      .from(leads)
      .innerJoin(businesses, eq(leads.businessId, businesses.id))
      .where(
        and(
          eq(leads.id, input.leadId),
          eq(leads.userId, userId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) throw new Error("LEAD_NOT_FOUND");

    // Rebuild the available fix plan on the server.
    const plan = buildFixPlan(row.business);
    if (plan.length === 0) throw new Error("NOTHING_TO_FIX");

    // Accept only packages supported by the actual plan.
    const selected =
      input.packages.length > 0
        ? selectFromPlan(input.packages, plan)
        : plan;

    if (selected.length === 0) {
      throw new Error("NO_VALID_PACKAGES");
    }

    // Prevent duplicate open requests.
    const existing = await tx
      .select({ id: fixRequests.id })
      .from(fixRequests)
      .where(
        and(
          eq(fixRequests.userId, userId),
          eq(fixRequests.leadId, input.leadId),
          sql`${fixRequests.status} IN ('new', 'quoted', 'in_progress')`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("REQUEST_ALREADY_OPEN");
    }

    const note = input.note?.trim().slice(0, FIX_NOTE_MAX) || null;

    // Free submission: no wallet or credit transaction.
    const [{ id: requestId }] = await tx
      .insert(fixRequests)
      .values({
        leadId: input.leadId,
        userId,
        packages: selected,
        totalKes: fixPlanTotalKes(selected),
        feeCredits: 0,
        note,
        status: "new",
      })
      .$returningId();

    return {
      id: requestId,
      status: "new" as const,
      packages: selected,
      feeCredits: 0,
    };
  });
}

/** Customer: list their own requests. */
export async function listMyFixRequests(userId: number) {
  const db = getDb();

  return db
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
}

/** Admin: list all Service Desk requests. */
export async function adminListFixRequests(
  statuses?: readonly FixRequestStatus[],
) {
  const db = getDb();

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

  const query =
    statuses && statuses.length > 0
      ? baseQuery.where(
          sql`${fixRequests.status} IN (${sql.join(
            statuses.map((status) => sql`${status}`),
            sql`, `,
          )})`,
        )
      : baseQuery;

  return query.orderBy(desc(fixRequests.createdAt));
}

/**
 * Admin: update request status, quotation, or internal note.
 * Historical paid requests retain their original refund behaviour.
 */
export async function adminUpdateFixRequest(input: {
  id: number;
  status?: FixRequestStatus;
  quotedKes?: number;
  adminNote?: string;
}) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(fixRequests)
      .where(eq(fixRequests.id, input.id))
      .limit(1);

    const request = rows[0];
    if (!request) throw new Error("REQUEST_NOT_FOUND");

    // Validate any supplied quotation.
    if (
      input.quotedKes !== undefined &&
      (!Number.isFinite(input.quotedKes) || input.quotedKes < 0)
    ) {
      throw new Error("INVALID_QUOTE");
    }

    // A quoted request must have a quotation.
    if (
      input.status === "quoted" &&
      (input.quotedKes ?? request.quotedKes) == null
    ) {
      throw new Error("QUOTE_REQUIRED");
    }

    const isStatusChange =
      input.status !== undefined &&
      input.status !== request.status;

    if (
      isStatusChange &&
      !canTransitionFix(request.status, input.status!)
    ) {
      throw new Error("INVALID_TRANSITION");
    }

    // Refund only historical requests that actually paid credits.
    const shouldRefund =
      isStatusChange &&
      input.status === "declined" &&
      request.feeCredits > 0;

    if (shouldRefund) {
      const refundCredits = request.feeCredits;

      await tx
        .update(wallets)
        .set({
          credits: sql`${wallets.credits} + ${refundCredits}`,
        })
        .where(eq(wallets.userId, request.userId));

      await tx.insert(creditTxns).values({
        userId: request.userId,
        kind: "refund",
        credits: refundCredits,
        amountKes: 0,
        status: "completed",
      });
    }

    await tx
      .update(fixRequests)
      .set({
        ...(input.status !== undefined
          ? { status: input.status }
          : {}),
        ...(input.quotedKes !== undefined
          ? { quotedKes: input.quotedKes }
          : {}),
        ...(input.adminNote !== undefined
          ? { adminNote: input.adminNote }
          : {}),
      })
      .where(eq(fixRequests.id, input.id));

    return {
      ok: true,
      id: input.id,
    };
  });
}
