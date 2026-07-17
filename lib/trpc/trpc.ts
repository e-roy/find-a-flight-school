import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { createContext } from "./context";
import { hasRole } from "@/lib/rbac";

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Admin-only procedure. Requires an authenticated session whose user has the
 * "admin" role. Use for any privileged/destructive operation (e.g. crawling).
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!hasRole(ctx.session, "admin")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin role required" });
  }
  return next();
});

