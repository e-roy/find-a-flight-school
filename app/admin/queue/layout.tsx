import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Crawl Queue Management",
  description:
    "Monitor and manage the crawl queue. View pending, completed, and failed crawl jobs. Retry failed jobs and track crawl status.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Crawl Queue Management",
    description: "Monitor and manage the crawl queue. View pending, completed, and failed crawl jobs.",
    type: "website",
    url: `${baseUrl}/admin/queue`,
  },
  twitter: {
    card: "summary",
    title: "Crawl Queue Management",
    description: "Monitor and manage the crawl queue.",
  },
};

export default function QueueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

