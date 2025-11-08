import type { Session } from "next-auth";
import type { UserRole } from "@/types/next-auth";

/**
 * Check if the user in the session has the required role.
 * Returns false if session is null or user doesn't have the role.
 * Role is now read directly from the session (populated from auth_users table).
 */
export function hasRole(
  session: Session | null,
  requiredRole: UserRole
): boolean {
  if (!session?.user?.id) {
    return false;
  }

  // Role is now included in session from auth callback
  const userRole = session.user.role || "user";
  
  // Check exact role match
  return userRole === requiredRole;
}

/**
 * Get the user's role from the session.
 * Returns null if session is invalid, otherwise returns the role (defaults to "user").
 */
export function getUserRole(session: Session | null): UserRole | null {
  if (!session?.user?.id) {
    return null;
  }

  // Role is now included in session from auth callback
  return (session.user.role as UserRole) || "user";
}
