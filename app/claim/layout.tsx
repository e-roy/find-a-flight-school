import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Claim Your Flight School",
  description:
    "Verify ownership of your flight school to submit edits and updates to your profile. Claim your school listing and manage your information.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Claim Your Flight School",
    description: "Verify ownership of your flight school to submit edits and updates to your profile.",
    type: "website",
    url: `${baseUrl}/claim`,
  },
  twitter: {
    card: "summary",
    title: "Claim Your Flight School",
    description: "Verify ownership of your flight school to submit edits and updates to your profile.",
  },
};

export default function ClaimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

