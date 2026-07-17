import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CrawlLockProvider } from "@/components/admin/CrawlLockContext";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Admin Console",
  description:
    "Internal operations: manage schools, crawl status, and snapshots.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Admin Console",
    description: "Internal operations console.",
    type: "website",
    url: `${baseUrl}/admin`,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side RBAC guard (defense-in-depth beyond middleware)
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  if (!hasRole(session, "admin")) redirect("/403");

  // The admin console renders its own dark chrome bar — no marketplace header.
  return <CrawlLockProvider>{children}</CrawlLockProvider>;
}
