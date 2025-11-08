import { router } from "@/lib/trpc/trpc";
import { seedsRouter } from "./seeds";
import { schoolsRouter } from "./schools";
import { crawlQueueRouter } from "./crawl-queue";
import { snapshotsRouter } from "./snapshots";
import { factsRouter } from "./facts";
import { signalsRouter } from "./signals";
import { matchRouter } from "./match";
import { dedupeRouter } from "./dedupe";
import { marketplaceRouter } from "./marketplace";
import { portalRouter } from "./portal";
import { adminRouter } from "./admin";

export const appRouter = router({
  seeds: seedsRouter,
  schools: schoolsRouter,
  crawlQueue: crawlQueueRouter,
  snapshots: snapshotsRouter,
  facts: factsRouter,
  signals: signalsRouter,
  match: matchRouter,
  dedupe: dedupeRouter,
  marketplace: marketplaceRouter,
  portal: portalRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
