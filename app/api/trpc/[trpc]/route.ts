import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/lib/trpc/context";

// Allow the synchronous "Crawl now" / "Re-crawl" mutations enough time to run a
// full crawl + extraction: homepage retries + top-N paced page fetches (~6s
// apart) + 429 backoffs + LLM extraction ≈ 2-4 min worst case. 300s is the
// Fluid Compute maximum on Hobby (default on all plans); requires Fluid
// Compute enabled on the Vercel project or the platform caps runtime at 60s.
export const maxDuration = 300;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };

