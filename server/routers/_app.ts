import { router } from "@/lib/trpc/trpc";
import { seedsRouter } from "./seeds";
import { schoolsRouter } from "./schools";
import { crawlQueueRouter } from "./crawl-queue";
import { snapshotsRouter } from "./snapshots";
import { matchRouter } from "./match";
import { marketplaceRouter } from "./marketplace";
import { portalRouter } from "./portal";
import { adminRouter } from "./admin";
import { claimRouter } from "./claim";

export const appRouter = router({
  seeds: seedsRouter,
  schools: schoolsRouter,
  crawlQueue: crawlQueueRouter,
  snapshots: snapshotsRouter,
  match: matchRouter,
  marketplace: marketplaceRouter,
  portal: portalRouter,
  admin: adminRouter,
  claim: claimRouter,
});

export type AppRouter = typeof appRouter;
