import { authRouter } from "./auth-router";
import { gridRouter } from "./grid-router";
import { leadsRouter } from "./leads-router";
import { paymentsRouter } from "./payments-router";
import { fixesRouter } from "./fixes-router";
import { osmRouter } from "./osm-router";
import { trustRouter } from "./trust-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  grid: gridRouter,
  leads: leadsRouter,
  payments: paymentsRouter,
  fixes: fixesRouter,
  osm: osmRouter,
  trust: trustRouter,
});

export type AppRouter = typeof appRouter;