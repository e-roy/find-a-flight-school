import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Search Flight Schools",
  description:
    "Search and filter flight schools by location, programs, budget, and aircraft type. Find the perfect flight training program for your needs.",
  keywords: [
    "search flight schools",
    "find flight school",
    "flight school search",
    "pilot training search",
    "aviation school finder",
  ],
  openGraph: {
    title: "Search Flight Schools",
    description:
      "Search and filter flight schools by location, programs, budget, and aircraft type. Find the perfect flight training program for your needs.",
    type: "website",
    url: `${baseUrl}/search`,
  },
  twitter: {
    card: "summary",
    title: "Search Flight Schools",
    description:
      "Search and filter flight schools by location, programs, budget, and aircraft type.",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

