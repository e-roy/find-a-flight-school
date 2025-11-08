import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createContext() {
  const session = await auth();
  return { db, session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

