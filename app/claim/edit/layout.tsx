import type { Metadata } from "next";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Edit School Profile",
  description:
    "Update your flight school profile information after claiming your school. Submit changes for moderation to keep your listing accurate.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Edit School Profile",
    description: "Update your flight school profile information after claiming your school.",
    type: "website",
    url: `${baseUrl}/claim/edit`,
  },
  twitter: {
    card: "summary",
    title: "Edit School Profile",
    description: "Update your flight school profile information after claiming your school.",
  },
};

export default function EditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

