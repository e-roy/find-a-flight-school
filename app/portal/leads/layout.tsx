import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Inbound Leads",
  description:
    "View and manage leads from students interested in your flight school. Track contact inquiries and follow up with potential students.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Inbound Leads",
    description: "View and manage leads from students interested in your flight school.",
    type: "website",
    url: `${baseUrl}/portal/leads`,
  },
  twitter: {
    card: "summary",
    title: "Inbound Leads",
    description: "View and manage leads from students interested in your flight school.",
  },
};

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

