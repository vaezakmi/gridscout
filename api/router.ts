import { authRouter } from "./auth-router";
import { gridRouter } from "./grid-router";
import { leadsRouter } from "./leads-router";
import { paymentsRouter } from "./payments-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  grid: gridRouter,
  leads: leadsRouter,
  payments: paymentsRouter,

  // TODO: add feature routers here, e.g.
  // todo: createRouter({
  //   list: publicQuery.query(() => findTodos()),
  // }),
});

export type AppRouter = typeof appRouter;
