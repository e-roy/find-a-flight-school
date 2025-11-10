import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Admin Overview",
  description:
    "Monitor system health and data operations. View schools, pending facts, queue status, and system metrics.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Admin Overview",
    description: "Monitor system health and data operations. View schools, pending facts, and queue status.",
    type: "website",
    url: `${baseUrl}/admin/overview`,
  },
  twitter: {
    card: "summary",
    title: "Admin Overview",
    description: "Monitor system health and data operations.",
  },
};

export default function AdminOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

