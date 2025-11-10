import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "School Analytics",
  description:
    "Track your flight school's performance metrics including profile views, click-through rates, match appearances, and leads.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "School Analytics",
    description: "Track your flight school's performance metrics including views, CTR, and leads.",
    type: "website",
    url: `${baseUrl}/portal/analytics`,
  },
  twitter: {
    card: "summary",
    title: "School Analytics",
    description: "Track your flight school's performance metrics.",
  },
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

