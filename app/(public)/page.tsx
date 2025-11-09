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

export const metadata: Metadata = {
  title: "Find-a-Flight-School — Compare Schools, Costs & Timelines",
  description:
    "Student-first marketplace to search and compare flight schools with standardized costs, timelines, and trust tiers. Start your search and choose with confidence.",
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
