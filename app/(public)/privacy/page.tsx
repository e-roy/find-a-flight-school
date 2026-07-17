import type { Metadata } from "next";
import { LegalPage } from "@/components/mk/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Find a Flight School collects and uses data. We collect as little as we can and never sell your personal data.",
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
