"use client";

import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

export function getTrpcClient() {
  return {
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
      }),
    ],
  };
}
