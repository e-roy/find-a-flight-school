import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Shield, ArrowRight, ExternalLink } from "lucide-react";
import { buttonClass } from "@/components/core/Button";

const REPO_ISSUES = "https://github.com/e-roy/find-a-flight-school/issues";
const UPDATED = "June 23, 2026";

type Doc = { title: string; intro: string; sections: [string, string[]][] };

const TERMS: Doc = {
  title: "Terms of Service",
  intro:
    "These terms govern your use of Find a Flight School. We keep them plain — read them, and reach out if anything's unclear.",
  sections: [
    ["Acceptance", ['By using Find a Flight School (the "Service"), you agree to these terms. If you\'re using the Service on behalf of a flight school, you confirm you\'re authorized to act for that school.']],
    ["What the Service is", ["We're an independent, student-first directory. We index flight schools, normalize the details that matter — programs, costs, timelines, fleet, financing — and let you search and compare them. We are not a flight school, a broker, or an agent for any school, and we don't take a cut of your training."]],
    ["Listings and data", [
      'Listings are built from public sources, including Google Places data and an automated crawl of each school\'s website, then normalized into a common format. Every fact carries a source and an "as-of" date.',
      "Data may be incomplete, out of date, or wrong. Always confirm details — price, availability, certification, aircraft — directly with the school before making a decision. Trust tiers indicate how a listing was verified, not a guarantee of quality or outcome.",
    ]],
    ["Adding and claiming a school", [
      "Anyone can add a school to the directory without an account. Adding a school doesn't make you its owner or representative.",
      "To claim and manage a listing, you must sign in with an email address on that school's domain. You're responsible for the accuracy of any details you confirm or edit, and for keeping them current.",
    ]],
    ["Acceptable use", ["Don't scrape the Service, submit false or misleading listings, impersonate a school you're not authorized to represent, or use the Service to harass, spam, or break the law. We may remove content or suspend access that violates these terms."]],
    ["Disclaimers", ['The Service is provided "as is," without warranties of any kind. We don\'t guarantee that listings are accurate, complete, or available, or that any school will meet your needs.']],
    ["Limitation of liability", ["To the fullest extent permitted by law, Find a Flight School isn't liable for indirect, incidental, or consequential damages arising from your use of the Service or your dealings with any school listed on it."]],
    ["Changes", ['We may update these terms from time to time. Material changes will be reflected in the "last updated" date above, and continued use of the Service means you accept the revised terms.']],
    ["Contact", ["This is a portfolio project, not a commercial service — there's no support inbox. Questions about these terms can be raised as an issue on the project's GitHub repository."]],
  ],
};

const PRIVACY: Doc = {
  title: "Privacy Policy",
  intro:
    "We collect as little as we can and we're direct about what we do with it. Here's the whole picture.",
  sections: [
    ["The short version", ["You can search and add schools without an account. We only ask you to sign in when you want to claim and verify a school. We don't sell your personal data."]],
    ["What we collect", [
      "Account data — only if you sign in: your name, email address, and profile photo, provided by Google when you choose to sign in with Google.",
      "Usage data — basic, privacy-respecting analytics about how the Service is used (pages viewed, searches run), to improve it.",
      "School submissions — when you add a school, we record the listing details and that a submission was made; you don't need to identify yourself to add one.",
    ]],
    ["Google sign-in", ["When you sign in with Google, we receive your basic profile (name, email, avatar) to identify you and to confirm whether your email domain matches a school you want to claim. We use Google only to verify your identity — we never post on your behalf and we don't access your contacts, mail, or files."]],
    ["School and crawl data", ["Listing content — programs, fleet, pricing, contact details — comes from public sources, including Google Places and an automated crawl of each school's public website. This is business information about schools, not personal data about you."]],
    ["How we use data", ["To run and improve the Service, to power search and comparison, to verify school claims via domain-matched email, and to keep the directory accurate and free of abuse."]],
    ["Sharing", ["We don't sell your personal data. We share it only with service providers that help us operate (for example, hosting and analytics), and when required by law."]],
    ["Cookies", ["We use essential cookies to keep you signed in and remember preferences, plus minimal analytics. You can control cookies through your browser settings."]],
    ["Your choices", ["You can review or update a claimed school's details anytime, sign out, or request deletion of your account and associated personal data. As this is a portfolio project, such requests can be raised as an issue on the project's GitHub repository."]],
    ["Retention", ["We keep account data while your account is active and personal data only as long as needed for the purposes above or as the law requires."]],
    ["Contact", ["This is a portfolio project, not a commercial service — there's no support inbox. Privacy questions can be raised as an issue on the project's GitHub repository."]],
  ],
};

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const doc = kind === "privacy" ? PRIVACY : TERMS;
  return (
    <div className="pt-page">
      <div className="pt-wrap">
        <Link className="mk-back" href="/">
          <ChevronLeft size={16} /> Back to home
        </Link>
        <div className="pt-head" style={{ marginTop: 10 }}>
          <span className="pt-eyebrow">
            <Shield size={13} /> Legal
          </span>
          <h1 className="pt-title">{doc.title}</h1>
          <p className="pt-legal__updated">Last updated {UPDATED}</p>
        </div>

        <div className="pt-card pt-legal">
          <p className="pt-legal__intro">{doc.intro}</p>
          {doc.sections.map(([h, paras]) => (
            <section className="pt-legal__sec" key={h}>
              <h2>{h}</h2>
              {paras.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
              {h === "Contact" && (
                <a
                  className="pt-legal__repo"
                  href={REPO_ISSUES}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={15} /> Open an issue on GitHub
                </a>
              )}
            </section>
          ))}
        </div>

        <div className="pt-legal__switch">
          <span>
            {kind === "privacy"
              ? "Looking for our terms?"
              : "Looking for our privacy policy?"}
          </span>
          <Link
            href={kind === "privacy" ? "/terms" : "/privacy"}
            className={buttonClass("secondary", "md")}
          >
            {kind === "privacy" ? "Read the Terms" : "Read the Privacy Policy"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
