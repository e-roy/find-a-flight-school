import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Manage Signals",
  description:
    "Manage trust signals and badges for flight schools. Set verification status, featured status, and other trust indicators.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Manage Signals",
    description: "Manage trust signals and badges for flight schools. Set verification status and featured status.",
    type: "website",
    url: `${baseUrl}/admin/signals`,
  },
  twitter: {
    card: "summary",
    title: "Manage Signals",
    description: "Manage trust signals and badges for flight schools.",
  },
};

export default function SignalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

