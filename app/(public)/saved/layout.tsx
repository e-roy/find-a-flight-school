import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Saved Flight Schools",
  description:
    "View your saved flight schools. Keep track of your favorite flight training programs and compare them later.",
  keywords: [
    "saved flight schools",
    "favorite flight schools",
    "flight school favorites",
  ],
  openGraph: {
    title: "Saved Flight Schools",
    description:
      "View your saved flight schools. Keep track of your favorite flight training programs and compare them later.",
    type: "website",
    url: `${baseUrl}/saved`,
  },
  twitter: {
    card: "summary",
    title: "Saved Flight Schools",
    description:
      "View your saved flight schools. Keep track of your favorite flight training programs.",
  },
};

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

