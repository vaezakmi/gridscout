import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { creditTxns, wallets } from "../db/schema";
import { log } from "./lib/logger";

export const darajaRoutes = new Hono();

type StkCallback = {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
};

darajaRoutes.post("/callback", async (c) => {
  try {
    let body: unknown = null;
    try {
      body = await c.req.json();
    } catch {
      // non-JSON probe — still acknowledge
    }

    const result = (body as { Body?: { stkCallback?: StkCallback } })?.Body
      ?.stkCallback;

    log.info("daraja callback received", {
      resultCode: result?.ResultCode ?? "unparsed",
      checkoutId: result?.CheckoutRequestID ?? null,
    });

    if (!result || result.ResultCode !== 0) {
      return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const checkoutId = result.CheckoutRequestID;
    if (!checkoutId) {
      log.warn("daraja callback missing CheckoutRequestID", { result });
      return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const db = getDb();
    const matches = await db
      .select()
      .from(creditTxns)
      .where(eq(creditTxns.mpesaRef, checkoutId))
      .limit(1);
    const txn = matches[0];
    if (!txn) {
      log.warn("daraja callback for unknown CheckoutRequestID", { checkoutId });
      return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const credited = await creditWalletForTxn(txn.id, checkoutId);
    if (!credited) {
      log.info("daraja callback: txn already processed", { txnId: txn.id });
    }

    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (e) {
    log.error("daraja callback failed", {
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    });
    return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});

darajaRoutes.get("/health", (c) =>
  c.json({ ok: true, mode: process.env.DARAJA_CONSUMER_KEY ? "live" : "demo" }),
);

export async function creditWalletForTxn(
  txnId: number,
  mpesaRef: string,
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(creditTxns)
    .set({ status: "completed", mpesaRef })
    .where(and(eq(creditTxns.id, txnId), eq(creditTxns.status, "pending")));

  const affected =
    (result as unknown as { affectedRows?: number }[])[0]?.affectedRows ?? 0;
  if (affected === 0) return false;

  const rows = await db
    .select()
    .from(creditTxns)
    .where(eq(creditTxns.id, txnId))
    .limit(1);
  const txn = rows[0];
  if (!txn) return false;

  await db
    .update(wallets)
    .set({ credits: sql`${wallets.credits} + ${txn.credits}` })
    .where(eq(wallets.userId, txn.userId));

  return true;
}