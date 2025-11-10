import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Compare Flight Schools",
  description:
    "Compare up to 4 flight schools side-by-side. Compare programs, costs, fleet, and features to make an informed decision about your flight training.",
  keywords: [
    "compare flight schools",
    "flight school comparison",
    "compare pilot training",
    "flight school comparison tool",
  ],
  openGraph: {
    title: "Compare Flight Schools",
    description:
      "Compare up to 4 flight schools side-by-side. Compare programs, costs, fleet, and features to make an informed decision.",
    type: "website",
    url: `${baseUrl}/compare`,
  },
  twitter: {
    card: "summary",
    title: "Compare Flight Schools",
    description:
      "Compare up to 4 flight schools side-by-side. Compare programs, costs, fleet, and features.",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

