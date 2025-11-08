import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

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
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Admin Console</h1>
        <p className="text-muted-foreground">
          Manage seeds, deduplication, crawl queue, snapshots, facts, signals, and match testing
        </p>
      </div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}

