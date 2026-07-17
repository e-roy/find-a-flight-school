import type { Metadata } from "next";
import { LegalPage } from "@/components/mk/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Find a Flight School — an independent, student-first flight school directory.",
};

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
