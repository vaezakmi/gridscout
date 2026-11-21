import { z } from "zod";
import { AREA_LIST } from "@contracts/grid";
import { adminQuery, createRouter } from "./middleware";
import { previewOsm } from "./lib/osm";

export const osmRouter = createRouter({
  preview: adminQuery
    .input(
      z.object({
        area: z.enum(AREA_LIST),
      }),
    )
    .query(async ({ input }) => {
      return previewOsm(input.area);
    }),
});
