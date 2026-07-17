import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

/**
 * Extract the client IP from standard proxy headers (Vercel sets
 * `x-forwarded-for`). Used for per-IP rate limiting on public procedures.
 */
function clientIp(opts?: FetchCreateContextFnOptions): string {
  const fwd = opts?.req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return opts?.req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function createContext(opts?: FetchCreateContextFnOptions) {
  // auth() automatically reads from request context in Next.js route handlers
  // Since tRPC handler is a Next.js route handler, this should work
  const session = await auth();
  return { db, session, ip: clientIp(opts) };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
