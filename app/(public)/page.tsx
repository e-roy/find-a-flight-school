import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TrustTiers } from "@/components/landing/TrustTiers";
import { MatchingAI } from "@/components/landing/MatchingAI";
import { Financing } from "@/components/landing/Financing";
import { CTABand } from "@/components/landing/CTABand";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";

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
      <Problem />
      <HowItWorks />
      <TrustTiers />
      <MatchingAI />
      <Financing />
      <CTABand />
      <FAQ />
      <Footer />
    </>
  );
}
