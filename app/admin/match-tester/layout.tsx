import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Match Tester",
  description:
    "Test and refine the matching algorithm. Run test queries and see which schools match specific criteria. Debug and improve search relevance.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Match Tester",
    description: "Test and refine the matching algorithm. Run test queries and see which schools match.",
    type: "website",
    url: `${baseUrl}/admin/match-tester`,
  },
  twitter: {
    card: "summary",
    title: "Match Tester",
    description: "Test and refine the matching algorithm.",
  },
};

export default function MatchTesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

