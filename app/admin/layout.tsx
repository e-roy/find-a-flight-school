import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { UserMenu } from "@/components/auth/UserMenu";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Admin Console",
  description:
    "Monitor system health and data operations. Manage schools, facts, queue, and system administration.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Admin Console",
    description: "Monitor system health and data operations. Manage schools, facts, and queue.",
    type: "website",
    url: `${baseUrl}/admin`,
  },
  twitter: {
    card: "summary",
    title: "Admin Console",
    description: "Monitor system health and data operations.",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side RBAC guard (defense-in-depth beyond middleware)
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!hasRole(session, "admin")) {
    redirect("/403");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Flight School Finder
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/search"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Search
              </Link>
            </div>
          </div>
          <div>
            <UserMenu />
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Admin Console</h1>
          </div>
          <AdminNav />
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
