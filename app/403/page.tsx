import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Access Forbidden - 403",
  description:
    "You don't have permission to access this page. Please contact an administrator if you believe this is an error.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Access Forbidden - 403",
    description: "You don't have permission to access this page.",
    type: "website",
    url: `${baseUrl}/403`,
  },
  twitter: {
    card: "summary",
    title: "Access Forbidden - 403",
    description: "You don't have permission to access this page.",
  },
};

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-destructive">403</h1>
        <h2 className="text-2xl font-semibold">Access Forbidden</h2>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page. Please contact an
          administrator if you believe this is an error.
        </p>
        <div className="flex gap-4 justify-center mt-6">
          <Button asChild variant="default">
            <Link href="/">Go Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
