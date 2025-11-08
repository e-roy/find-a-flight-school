import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect /admin to /admin/overview
  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/overview", request.url));
  }

  // Check if path requires authentication
  const isPortalRoute = pathname.startsWith("/portal");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isPortalRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // Get session (next-auth v5 requires passing request)
  const session = await auth();

  // If not authenticated, redirect to sign-in
  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role requirements
  if (isAdminRoute) {
    const isAdmin = await hasRole(session, "admin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  if (isPortalRoute) {
    const isSchool = await hasRole(session, "school");
    if (!isSchool) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/admin"],
};
