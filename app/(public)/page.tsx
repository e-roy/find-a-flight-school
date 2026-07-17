import type { Metadata } from "next";
import { Hero } from "@/components/mk/landing/Hero";
import { Featured } from "@/components/mk/landing/Featured";
import {
  TrustStrip,
  FinancingBand,
  HowItWorks,
  Tiers,
  CTABand,
} from "@/components/mk/landing/sections";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Find a Flight School — Compare Schools, Costs & Timelines",
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
    "flight school directory",
  ],
  openGraph: {
    title: "Find a Flight School — Compare Schools, Costs & Timelines",
    description:
      "Student-first marketplace to search and compare flight schools with standardized costs, timelines, and trust tiers. Start your search and choose with confidence.",
    type: "website",
    url: baseUrl,
    siteName: "Find a Flight School",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "Find a Flight School - Compare flight schools and find the perfect training program",
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
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <FinancingBand />
      <HowItWorks />
      <Tiers />
      <Featured />
      <CTABand />
    </>
  );
}
