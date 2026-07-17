import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/lib/trpc/context";

// Allow the synchronous "Crawl now" / "Re-crawl" mutations enough time to run a
// full crawl + extraction (homepage + top-N pages, with 429 backoff on free tier).
export const maxDuration = 60;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };

