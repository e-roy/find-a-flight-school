import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createContext(opts?: FetchCreateContextFnOptions) {
  // auth() automatically reads from request context in Next.js route handlers
  // Since tRPC handler is a Next.js route handler, this should work
  const session = await auth();
  return { db, session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
