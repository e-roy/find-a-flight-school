import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Manage Schools",
  description:
    "View and manage flight school records. Browse all schools, view crawl status, and access school administration tools.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Manage Schools",
    description: "View and manage flight school records. Browse all schools and view crawl status.",
    type: "website",
    url: `${baseUrl}/admin/schools`,
  },
  twitter: {
    card: "summary",
    title: "Manage Schools",
    description: "View and manage flight school records.",
  },
};

export default function SchoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

