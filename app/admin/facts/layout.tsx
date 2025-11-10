import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Fact Moderation",
  description:
    "Review and moderate fact submissions from schools. Approve or reject proposed changes to flight school profiles.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Fact Moderation",
    description: "Review and moderate fact submissions from schools. Approve or reject proposed changes.",
    type: "website",
    url: `${baseUrl}/admin/facts`,
  },
  twitter: {
    card: "summary",
    title: "Fact Moderation",
    description: "Review and moderate fact submissions from schools.",
  },
};

export default function FactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

