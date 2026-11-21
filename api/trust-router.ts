import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { parseMpesaSms } from "./lib/trust/mpesa-parser";
import { computeGridTrust } from "./lib/trust/scoring";
import { pushStk } from "./lib/trust/daraja";

export const trustRouter = createRouter({
  getScore: publicQuery
    .input(z.object({ businessId: z.number() }))
    .query(async ({ input }) => {
      // TODO: replace 28/42/68 with real: computeScores(b) + callLogs + mpesaTransactions
      void input;
      return computeGridTrust(28, 42, 68);
    }),

  ingestSms: authedQuery
    .input(z.object({ businessId: z.number(), rawSms: z.string() }))
    .mutation(async ({ input }) => {
      const p = parseMpesaSms(input.rawSms);
      if (!p) throw new Error("Unparsable M-Pesa SMS");
      return p;
    }),

  paySubscription: authedQuery
    .input(z.object({ businessId: z.number(), phone: z.string() }))
    .mutation(async ({ input }) => {
      return pushStk(input.phone, 999, `GRIDTRUST-${input.businessId}`);
    }),
});