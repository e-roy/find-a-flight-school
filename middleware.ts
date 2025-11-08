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

  // Get session with error handling
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Middleware auth error:", error);
    // If auth fails, redirect to sign-in
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If not authenticated, redirect to sign-in
  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Check role requirements (hasRole is now synchronous)
  if (isAdminRoute) {
    const isAdmin = hasRole(session, "admin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  if (isPortalRoute) {
    const isSchool = hasRole(session, "school");
    if (!isSchool) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*", "/admin"],
};
