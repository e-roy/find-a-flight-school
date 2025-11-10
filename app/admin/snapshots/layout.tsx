import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Data Snapshots",
  description:
    "View historical data snapshots from crawled flight school websites. Browse past versions of school data and compare changes over time.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Data Snapshots",
    description: "View historical data snapshots from crawled flight school websites.",
    type: "website",
    url: `${baseUrl}/admin/snapshots`,
  },
  twitter: {
    card: "summary",
    title: "Data Snapshots",
    description: "View historical data snapshots from crawled flight school websites.",
  },
};

export default function SnapshotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

