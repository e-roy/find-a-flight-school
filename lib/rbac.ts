import type { Session } from "next-auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "user" | "school" | "admin";

/**
 * Check if the user in the session has the required role.
 * Returns false if session is null or user doesn't have the role.
 */
export async function hasRole(
  session: Session | null,
  requiredRole: UserRole
): Promise<boolean> {
  if (!session?.user?.id) {
    return false;
  }

  try {
    const profile = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (profile.length === 0) {
      // User profile doesn't exist, default to 'user' role
      // Create profile with default role
      await db.insert(userProfiles).values({
        userId: session.user.id,
        role: "user",
      });
      return requiredRole === "user";
    }

    const userRole = profile[0]?.role;
    if (!userRole) {
      return false;
    }

    // Check exact role match
    return userRole === requiredRole;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

/**
 * Get the user's role from the database.
 * Returns null if session is invalid or profile doesn't exist.
 */
export async function getUserRole(
  session: Session | null
): Promise<UserRole | null> {
  if (!session?.user?.id) {
    return null;
  }

  try {
    const profile = await db
      .select({ role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (profile.length === 0) {
      return null;
    }

    return (profile[0]?.role as UserRole) || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}
