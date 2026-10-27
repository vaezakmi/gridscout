import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { creditTxns, wallets } from "../../db/schema";
import { log } from "../lib/logger";

/**
 * Safaricom Daraja confirmation/callback webhook.
 *
 * Live mode mapping: when Daraja credentials are configured, map the Daraja
 * "stkCallback" payload to the pending credit_txns row (match on the
 * checkout request id stored in mpesaRef at initiate time) and credit the
 * wallet exactly like confirmDemo does. In demo mode the endpoint simply
 * acknowledges receipt so the integration contract is already in place.
 */
export const darajaRoutes = new Hono();

darajaRoutes.post("/callback", async (c) => {
  let body: unknown = null;
  try {
    body = await c.req.json();
  } catch {
    // non-JSON probe — still acknowledge
  }
  const result = (body as { Body?: { stkCallback?: { ResultCode?: number } } })
    ?.Body?.stkCallback;
  log.info("daraja callback received", {
    resultCode: result?.ResultCode ?? "unparsed",
  });

  if (result && result.ResultCode === 0) {
    // Live path: locate pending txn and credit wallet (see header comment).
  }
  return c.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

// Minimal listM-pesa-style status probe for ops
darajaRoutes.get("/health", (c) => c.json({ ok: true, mode: process.env.DARAJA_CONSUMER_KEY ? "live" : "demo" }));

export async function creditWalletForTxn(txnId: number, mpesaRef: string) {
  const db = getDb();
  const txn = await db
    .select()
    .from(creditTxns)
    .where(eq(creditTxns.id, txnId))
    .limit(1);
  const t = txn[0];
  if (!t || t.status !== "pending") return false;
  await db
    .update(creditTxns)
    .set({ status: "completed", mpesaRef })
    .where(eq(creditTxns.id, t.id));
  const wallet = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, t.userId))
    .limit(1);
  if (wallet[0]) {
    await db
      .update(wallets)
      .set({ credits: wallet[0].credits + t.credits })
      .where(eq(wallets.userId, t.userId));
  }
  return true;
}
