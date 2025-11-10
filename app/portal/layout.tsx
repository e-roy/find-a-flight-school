import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalNav } from "@/components/portal/PortalNav";
import { auth } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "School Portal",
  description:
    "Manage your flight school profile, view leads, and track your progress. Access your school dashboard and analytics.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "School Portal",
    description: "Manage your flight school profile, view leads, and track your progress.",
    type: "website",
    url: `${baseUrl}/portal`,
  },
  twitter: {
    card: "summary",
    title: "School Portal",
    description: "Manage your flight school profile, view leads, and track your progress.",
  },
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side RBAC guard (defense-in-depth beyond middleware)
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  if (!hasRole(session, "school")) {
    redirect("/403");
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">School Portal</h1>
        <p className="text-muted-foreground">
          Manage your school profile, view leads, and track analytics
        </p>
      </div>
      <PortalNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}

