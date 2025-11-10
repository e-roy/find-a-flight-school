import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Verify Claim",
  description:
    "Verify your email address to complete your flight school claim. Click the verification link sent to your email.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Verify Claim",
    description: "Verify your email address to complete your flight school claim.",
    type: "website",
    url: `${baseUrl}/claim/verify`,
  },
  twitter: {
    card: "summary",
    title: "Verify Claim",
    description: "Verify your email address to complete your flight school claim.",
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

