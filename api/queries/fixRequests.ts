import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../queries/connection";
import {
  leads,
  businesses,
  fixRequests,
  users,
} from "../../db/schema";
import {
  buildFixPlan,
  fixPlanTotalKes,
  type FixPackageId,
} from "../../contracts/grid";
import {
  FIX_NOTE_MAX,
  canTransitionFix,
  type FixRequestStatus,
} from "../../contracts/fixes";

const leadWithBusiness = {
  lead: leads,
  business: businesses,
};

export async function submitFixRequest(
  userId: number,
  input: {
    leadId: number;
    packages: FixPackageId[];
    note?: string;
  },
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    // Serialize submissions for this lead before checking active requests.
    const lockedLead = await tx
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.id, input.leadId),
          eq(leads.userId, userId),
        ),
      )
      .limit(1)
      .for("update");

    if (!lockedLead[0]) throw new Error("LEAD_NOT_FOUND");

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

    const existingRequest = await tx
      .select({ id: fixRequests.id })
      .from(fixRequests)
      .where(
        and(
          eq(fixRequests.leadId, input.leadId),
          inArray(fixRequests.status, [
            "new",
            "quoted",
            "in_progress",
          ]),
        ),
      )
      .limit(1);

    if (existingRequest[0]) {
      throw new Error("REQUEST_ALREADY_OPEN");
    }

    const business = row.business;

    const plan = buildFixPlan({
      claimed: business.claimed,
      rating: business.rating,
      reviewCount: business.reviewCount,
      respondsToReviews: business.respondsToReviews,
      photos: business.photos,
      posts: business.posts,
      website: business.website,
      mobileOk: business.mobileOk,
      metaOk: business.metaOk,
      siteSpeed: business.siteSpeed,
    });

    if (plan.length === 0) {
      throw new Error("NOTHING_TO_FIX");
    }

    const requested = new Set(input.packages);
    const selected = input.packages.length > 0
      ? plan.filter((id) => requested.has(id))
      : plan;

    if (selected.length === 0) {
      throw new Error("NO_VALID_PACKAGES");
    }

    const note = input.note?.trim().slice(0, FIX_NOTE_MAX) || null;

    const [{ id: requestId }] = await tx
      .insert(fixRequests)
      .values({
        userId,
        leadId: input.leadId,
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
      totalKes: fixPlanTotalKes(selected),
    };
  });
}

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

export async function adminListFixRequests(
  statuses?: readonly FixRequestStatus[],
) {
  const db = getDb();

  const baseQuery = db
    .select({
      id: fixRequests.id,
      userId: fixRequests.userId,
      requester: {
        name: users.name,
        email: users.email,
      },
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
    .innerJoin(users, eq(fixRequests.userId, users.id))
    .innerJoin(leads, eq(fixRequests.leadId, leads.id))
    .innerJoin(businesses, eq(leads.businessId, businesses.id));

  const query = statuses && statuses.length > 0
    ? baseQuery.where(inArray(fixRequests.status, [...statuses]))
    : baseQuery;

  return query.orderBy(desc(fixRequests.createdAt));
}

export async function acceptMyFixQuote(
  userId: number,
  requestId: number,
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(fixRequests)
      .where(
        and(
          eq(fixRequests.id, requestId),
          eq(fixRequests.userId, userId),
        ),
      )
      .limit(1)
      .for("update");

    const request = rows[0];

    if (!request) throw new Error("REQUEST_NOT_FOUND");

    if (!canTransitionFix(request.status, "in_progress")) {
      throw new Error("INVALID_TRANSITION");
    }

    if (request.status !== "quoted") {
      throw new Error("INVALID_TRANSITION");
    }

    if (!request.quotedKes || request.quotedKes <= 0) {
      throw new Error("QUOTE_REQUIRED");
    }

    await tx
      .update(fixRequests)
      .set({ status: "in_progress" })
      .where(
        and(
          eq(fixRequests.id, requestId),
          eq(fixRequests.userId, userId),
          eq(fixRequests.status, "quoted"),
        ),
      );

    return {
      ok: true,
      status: "in_progress" as const,
    };
  });
}
export async function declineMyFixQuote(
  userId: number,
  requestId: number,
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(fixRequests)
      .where(
        and(
          eq(fixRequests.id, requestId),
          eq(fixRequests.userId, userId),
        ),
      )
      .limit(1)
      .for("update");

    const request = rows[0];

    if (!request) throw new Error("REQUEST_NOT_FOUND");

    if (request.status !== "quoted") {
      throw new Error("INVALID_TRANSITION");
    }

    await tx
      .update(fixRequests)
      .set({ status: "declined" })
      .where(
        and(
          eq(fixRequests.id, requestId),
          eq(fixRequests.userId, userId),
          eq(fixRequests.status, "quoted"),
        ),
      );

    return {
      ok: true,
      status: "declined" as const,
    };
  });
}
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
      .limit(1)
      .for("update");

    const request = rows[0];

    if (!request) {
      throw new Error("REQUEST_NOT_FOUND");
    }

    if (
      input.status &&
      input.status !== request.status &&
      !canTransitionFix(request.status, input.status)
    ) {
      throw new Error("INVALID_TRANSITION");
    }

    // Quotes may only be set or revised before work begins.
    if (
      input.quotedKes !== undefined &&
      request.status !== "new" &&
      request.status !== "quoted"
    ) {
      throw new Error("INVALID_TRANSITION");
    }

    const effectiveQuote = input.quotedKes ?? request.quotedKes;

    if (input.status === "in_progress") {
      throw new Error("AGENCY_ACCEPTANCE_REQUIRED");
    }

    if (input.status === "quoted" && (!effectiveQuote || effectiveQuote <= 0)) {
      throw new Error("QUOTE_REQUIRED");
    }

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