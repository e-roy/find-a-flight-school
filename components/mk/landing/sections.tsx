import * as React from "react";
import Link from "next/link";
import { Banknote, Percent, Check, Search, Shield, Clock, ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/core/Button";
import { TierBadge, type DesignTier } from "@/components/mk/TierBadge";
import { Img } from "@/components/mk/Img";

export function TrustStrip() {
  const stats: [string, string][] = [
    ["2,400+", "Flight schools indexed"],
    ["1 in 3", "Offer student financing"],
    ["4 tiers", "Of verified trust"],
    ["$0", "Cost to students"],
  ];
  return (
    <div className="mk-strip">
      <div className="mk-shell mk-strip__in">
        {stats.map(([n, l]) => (
          <div className="mk-strip__item" key={l}>
            <span className="mk-strip__num">{n}</span>
            <span className="mk-strip__lbl">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FinancingBand() {
  const points: [React.ReactNode, string, string][] = [
    [
      <Banknote size={20} key="b" />,
      "Monthly plans",
      "Spread tuition over time — payments from about $385/mo at partner schools.",
    ],
    [
      <Percent size={20} key="p" />,
      "Pre-qualify fast",
      "Check rates from lenders like Stratus and AOPA Finance without a hard credit pull.",
    ],
    [
      <Check size={20} key="c" />,
      "Filter in one tap",
      "Toggle “Financing available” to see only schools that offer payment plans.",
    ],
  ];
  return (
    <section className="mk-fin">
      <div className="mk-shell mk-fin__in">
        <div className="mk-fin__copy">
          <span className="mk-eyebrow">
            <Banknote size={14} /> Financing
          </span>
          <h2 className="mk-h2">Don&apos;t let upfront cost stall your training</h2>
          <p className="mk-fin__lead">
            Flight training is a big investment — paying out of pocket is the #1
            reason students stall. We surface which schools offer financing, what
            monthly payments look like, and who their lending partners are.
          </p>
          <div className="mk-fin__points">
            {points.map(([icon, t, d]) => (
              <div className="mk-fin__point" key={t}>
                <span className="mk-fin__icon">{icon}</span>
                <div>
                  <span className="mk-fin__pt">{t}</span>
                  <span className="mk-fin__pd">{d}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mk-fin__cta">
            <Link
              href="/search?financingAvailable=true"
              className={buttonClass("primary", "lg")}
            >
              <Banknote size={18} />
              Browse schools with financing
              <ArrowRight size={18} />
            </Link>
            <span className="mk-fin__note">
              Estimates only — final terms come from the school and its lender.
            </span>
          </div>
        </div>
        <div className="mk-fin__media">
          <Img
            ratio="3 / 4"
            radius={18}
            label="Financing image"
            src="/images/finance-image.png"
            alt="Student pilot reviewing a training payment plan at a kitchen table, aviation headset beside them"
            prompt="Bright, hopeful photo of a young adult reviewing a payment plan at a kitchen table, aviation headset nearby. Warm daylight, optimistic, photographic, no text."
          />
          <div className="mk-fin__chip">
            <span className="mk-fin__chiplabel">Est. from</span>
            <span className="mk-fin__chipval">
              $385<span>/mo</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps: [React.ReactNode, string, string][] = [
    [
      <Search size={22} key="s" />,
      "Search & filter",
      "Filter by program, budget, financing, Part 61/141, fleet, and more — results update as you go.",
    ],
    [
      <Banknote size={22} key="b" />,
      "Weigh cost & financing",
      "Normalized Expected Total Cost bands sit next to monthly financing estimates, so the real number is clear.",
    ],
    [
      <Shield size={22} key="sh" />,
      "Decide with confidence",
      "Trust tiers and evidence panels show what's verified — and when it was last updated.",
    ],
  ];
  return (
    <section className="mk-section">
      <div className="mk-shell">
        <div className="mk-section__head">
          <span className="mk-eyebrow">How it works</span>
          <h2 className="mk-h2">Three steps to your match</h2>
        </div>
        <div className="mk-steps">
          {steps.map(([icon, t, d], i) => (
            <div className="mk-step" key={t}>
              <div className="mk-step__top">
                <span className="mk-step__icon">{icon}</span>
                <span className="mk-step__n">Step {i + 1}</span>
              </div>
              <h3 className="mk-step__title">{t}</h3>
              <p className="mk-step__desc">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Tiers() {
  const tiers: [DesignTier, string][] = [
    [
      "premier",
      "Exceeds composite operational benchmarks — training velocity, schedule reliability, and satisfaction.",
    ],
    [
      "verified",
      "Facts cross-checked against aggregated operational signals like hours-to-rating and instructor coverage.",
    ],
    [
      "community",
      "Claimed profile with documentation and periodic attestations from the school.",
    ],
    [
      "unverified",
      "Discovered via crawl; not yet claimed or verified. Treat the data as a starting point.",
    ],
  ];
  return (
    <section className="mk-section mk-section--sink">
      <div className="mk-shell">
        <div className="mk-section__head">
          <span className="mk-eyebrow">Trust, made transparent</span>
          <h2 className="mk-h2">Every profile shows its tier</h2>
        </div>
        <div className="mk-tiers">
          {tiers.map(([t, d]) => (
            <div className="mk-tiercard" key={t}>
              <TierBadge tier={t} />
              <p className="mk-tiercard__desc">{d}</p>
            </div>
          ))}
        </div>
        <p className="mk-tiers__note">
          <Clock size={14} /> Each fact carries an &quot;as-of&quot; timestamp;
          outliers are flagged for review.
        </p>
      </div>
    </section>
  );
}

export function CTABand() {
  return (
    <section className="mk-cta">
      <div className="mk-shell mk-cta__in">
        <div>
          <h2 className="mk-cta__title">Ready to find your runway?</h2>
          <p className="mk-cta__lead">
            Start your search free. Student-first, school-agnostic.
          </p>
        </div>
        <Link href="/search" className={buttonClass("primary", "lg")}>
          Start your search
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
