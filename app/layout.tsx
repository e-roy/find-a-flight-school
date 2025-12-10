import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TRPCProvider from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Find a Flight School — Compare Schools, Costs & Timelines",
    template: "%s | Find a Flight School",
  },
  description:
    "Student-first marketplace to search and compare flight schools with standardized costs, timelines, and trust tiers. Start your search and choose with confidence.",
  keywords: [
    "flight school",
    "pilot training",
    "aviation school",
    "compare flight schools",
    "pilot license",
    "PPL",
    "CPL",
    "instrument rating",
    "flight training cost",
  ],
  authors: [{ name: "Find a Flight School" }],
  creator: "Find a Flight School",
  publisher: "Find a Flight School",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Find a Flight School",
    title: "Find a Flight School — Compare Schools, Costs & Timelines",
    description:
      "Student-first marketplace to search and compare flight schools with standardized costs, timelines, and trust tiers.",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "Find a Flight School",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find a Flight School — Compare Schools, Costs & Timelines",
    description:
      "Student-first marketplace to search and compare flight schools with standardized costs, timelines, and trust tiers.",
    images: ["/images/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {process.env.NODE_ENV !== "development" && (
        <>
          <Script
            src="https://propintel-eight.vercel.app/api/script/hzc3GsQ88BgtL8jd"
            strategy="afterInteractive"
          />
        </>
      )}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCProvider>{children}</TRPCProvider>
        <Toaster />
      </body>
    </html>
  );
}
