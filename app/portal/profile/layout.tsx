import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Edit School Profile",
  description:
    "Update your flight school profile information. Submit changes for moderation to keep your listing accurate and up-to-date.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Edit School Profile",
    description: "Update your flight school profile information. Submit changes for moderation.",
    type: "website",
    url: `${baseUrl}/portal/profile`,
  },
  twitter: {
    card: "summary",
    title: "Edit School Profile",
    description: "Update your flight school profile information.",
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

