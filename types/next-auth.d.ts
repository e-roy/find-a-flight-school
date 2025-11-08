import "next-auth";
import type { DefaultSession } from "next-auth";

export type UserRole = "user" | "school" | "admin";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      role?: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: UserRole;
  }
}
