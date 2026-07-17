"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldCheck,
  Globe,
  Plane,
  MapPin,
  ArrowRight,
  Check,
  Loader2,
  X,
} from "lucide-react";
import { Button, buttonClass } from "@/components/core/Button";
import { TierBadge } from "@/components/mk/TierBadge";
import { Rating } from "@/components/mk/Rating";
import { Stepper } from "@/components/mk/portal-bits";
import { ClaimReview } from "@/components/mk/ClaimReview";
import { trpc } from "@/lib/trpc/client";
import { organizeFactsByCategory } from "@/lib/utils-facts";
import { mkTier } from "@/lib/mk";

const STEPS = ["Confirm school", "Crawl site", "Review details"];

function Shell({
  children,
  lead = "Confirm this is your school, we'll read your site, then you review what students see.",
}: {
  children: React.ReactNode;
  lead?: string;
}) {
  return (
    <div className="pt-page">
      <div className="pt-wrap">
        <div className="pt-head">
          <span className="pt-eyebrow">
            <Shield size={13} /> Claim your school
          </span>
          <h1 className="pt-title">Take ownership of your listing</h1>
          <p className="pt-lead">{lead}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ClaimFlow() {
  const match = trpc.claim.match.useQuery(undefined, { retry: false });

  if (match.isLoading) {
    return (
      <Shell>
        <div className="pt-card">
          <div className="pt-crawl">
            <div className="pt-crawl__ico">
              <Loader2 size={28} />
            </div>
            <h2 className="pt-crawl__title">Checking your account…</h2>
          </div>
        </div>
      </Shell>
    );
  }

  // Not signed in.
  if (match.error || !match.data) {
    return (
      <Shell lead="Sign in with your work email to claim and manage your school's listing.">
        <div className="pt-card">
          <div className="pt-done">
            <div
              className="pt-done__mark"
              style={{ background: "var(--accent-tint)", color: "var(--accent-hover)" }}
            >
              <Shield size={30} />
            </div>
            <h2 className="pt-done__title">Sign in to claim</h2>
            <p className="pt-done__text">
              Claiming is verified by your email domain — sign in with an email
              at your school&apos;s website domain.
            </p>
          </div>
          <div className="pt-actions" style={{ justifyContent: "center" }}>
            <Link
              href="/sign-in?callbackUrl=/claim"
              className={buttonClass("primary", "md")}
            >
              Sign in <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (match.data.status === "free") {
    return (
      <Shell lead="Claiming a school is verified purely by your work email domain.">
        <div className="pt-card">
          <div className="pt-callout pt-callout--amber">
            <span className="pt-callout__icon">
              <Shield size={20} />
            </span>
            <div>
              <p className="pt-callout__title">
                A work email is required to claim
              </p>
              <p className="pt-callout__text">
                You&apos;re signed in with{" "}
                <b>{match.data.email ?? "a personal account"}</b>. Only an email
                that matches a school&apos;s website domain can claim its
                listing — personal providers (Gmail, Outlook, …) can&apos;t.
              </p>
            </div>
          </div>
          <div className="pt-actions" style={{ justifyContent: "center", gap: 10 }}>
            <Link href="/add-school" className={buttonClass("secondary", "md")}>
              Add a school
            </Link>
            <Link href="/search" className={buttonClass("ghost", "md")}>
              Browse schools <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (match.data.status === "no-match") {
    return (
      <Shell lead={`We didn't find a listing for ${match.data.domain} yet.`}>
        <div className="pt-card">
          <div className="pt-done">
            <div
              className="pt-done__mark"
              style={{ background: "var(--surface-well)", color: "var(--text-muted)" }}
            >
              <MapPin size={30} />
            </div>
            <h2 className="pt-done__title">No listing for {match.data.domain}</h2>
            <p className="pt-done__text">
              Add <b>{match.data.domain}</b> to the directory first — once
              it&apos;s listed, come back here and you&apos;ll be able to claim
              it with your matching email.
            </p>
          </div>
          <div className="pt-actions" style={{ justifyContent: "center" }}>
            <Link href="/add-school" className={buttonClass("primary", "md")}>
              Add my school <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <ClaimSteps
      schoolId={match.data.schoolId}
      email={match.data.email ?? ""}
      domain={match.data.domain ?? ""}
    />
  );
}

function ClaimSteps({
  schoolId,
  email,
  domain,
}: {
  schoolId: string;
  email: string;
  domain: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const schoolQ = trpc.schools.byIdWithFacts.useQuery({ id: schoolId });
  const facts = React.useMemo(
    () => organizeFactsByCategory(schoolQ.data?.facts),
    [schoolQ.data?.facts]
  );

  if (!schoolQ.data?.school) {
    return (
      <Shell>
        <div className="pt-card">
          <div className="pt-crawl">
            <div className="pt-crawl__ico">
              <Loader2 size={28} />
            </div>
            <h2 className="pt-crawl__title">Loading your school…</h2>
          </div>
        </div>
      </Shell>
    );
  }

  const school = schoolQ.data.school;
  const addr = (school.addrStd ?? {}) as Record<string, unknown>;
  const loc = [addr.city, addr.state].filter((x) => typeof x === "string").join(", ");
  const tier = mkTier(schoolQ.data.signals, schoolQ.data.claimed);

  if (step === 3) {
    return (
      <Shell lead="Your listing is live and verified.">
        <Stepper steps={STEPS} current={3} />
        <div className="pt-card">
          <div className="pt-done">
            <div className="pt-done__mark">
              <ShieldCheck size={32} />
            </div>
            <h2 className="pt-done__title">{school.canonicalName} is claimed</h2>
            <p className="pt-done__text">
              Your profile is live and now carries a <b>Community-Verified</b>{" "}
              badge. You can edit details anytime from your work email.
            </p>
          </div>
          <div className="pt-actions" style={{ justifyContent: "center", gap: 10 }}>
            <Link
              href={`/schools/${schoolId}`}
              className={buttonClass("secondary", "md")}
            >
              View public profile
            </Link>
            <Button variant="primary" onClick={() => router.push("/")}>
              Done <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <>
          <div className="pt-matchbar">
            <Shield size={16} />
            Verified — <code>{email}</code> matches <code>{domain}</code>
          </div>
          <div className="pt-card">
            <div className="pt-confirm">
              <span className="pt-confirm__badge">
                <Plane size={28} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                  <TierBadge tier={tier} size="sm" />
                </div>
                <h2 className="pt-confirm__name">{school.canonicalName}</h2>
                <div className="pt-confirm__meta">
                  {loc && (
                    <span>
                      <MapPin size={15} /> {loc}
                    </span>
                  )}
                  {facts.airportCode && (
                    <span className="is-mono">{facts.airportCode}</span>
                  )}
                  {facts.rating != null && (
                    <Rating value={facts.rating} count={facts.ratingCount} />
                  )}
                </div>
                <p
                  style={{
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-muted)",
                    lineHeight: "var(--lh-normal)",
                    margin: "14px 0 0",
                  }}
                >
                  We matched this listing to your domain. Claiming lets you
                  confirm and edit the details students see and earn a{" "}
                  <b>Community-Verified</b> badge.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-callout pt-callout--amber" style={{ marginTop: 16 }}>
            <span className="pt-callout__icon">
              <Globe size={20} />
            </span>
            <div>
              <p className="pt-callout__title">Next: we&apos;ll crawl your website</p>
              <p className="pt-callout__text">
                Confirming kicks off an automated read of <b>{domain}</b> to
                pull your programs, fleet, and pricing. You&apos;ll review and
                edit everything before it goes live.
              </p>
            </div>
          </div>
          <div className="pt-actions">
            <Button variant="ghost" onClick={() => router.push("/")}>
              Not my school
            </Button>
            <Button
              variant="primary"
              onClick={() => setStep(1)}
              rightIcon={<ArrowRight size={16} />}
            >
              Yes, claim this school
            </Button>
          </div>
        </>
      )}

      {step === 1 && (
        <CrawlStep
          schoolId={schoolId}
          domain={domain}
          onDone={async () => {
            await schoolQ.refetch();
            setStep(2);
            window.scrollTo(0, 0);
          }}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <ClaimReview
          schoolId={schoolId}
          facts={facts}
          onPublished={() => {
            setStep(3);
            window.scrollTo(0, 0);
          }}
        />
      )}
    </Shell>
  );
}

const CRAWL_PAGES = [
  { label: "Reading homepage", page: "/" },
  { label: "Parsing training programs", page: "/training" },
  { label: "Reading fleet & aircraft", page: "/fleet" },
  { label: "Extracting pricing", page: "/pricing" },
  { label: "Checking financing partners", page: "/financing" },
];

function CrawlStep({
  schoolId,
  domain,
  onDone,
  onBack,
}: {
  schoolId: string;
  domain: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const [done, setDone] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const crawl = trpc.claim.crawl.useMutation();
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    crawl.mutate(
      { schoolId },
      {
        onSuccess: (res) => {
          if (cancelled) return;
          if (res.status === "completed") {
            setDone(CRAWL_PAGES.length);
            setTimeout(() => !cancelled && onDone(), 700);
          } else {
            setError(res.error || "The crawl didn't complete. Try again.");
          }
        },
        onError: (e) => !cancelled && setError(e.message),
      }
    );
    const t = setInterval(
      () => setDone((d) => Math.min(d + 1, CRAWL_PAGES.length - 1)),
      760
    );
    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="pt-card">
        <div className="pt-done">
          <div
            className="pt-done__mark"
            style={{ background: "var(--danger-tint)", color: "var(--danger)" }}
          >
            <X size={32} />
          </div>
          <h2 className="pt-done__title">Couldn&apos;t crawl your site</h2>
          <p className="pt-done__text">{error}</p>
        </div>
        <div className="pt-actions" style={{ justifyContent: "center" }}>
          <Button variant="secondary" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  const pct = Math.round((done / CRAWL_PAGES.length) * 100);
  const complete = done >= CRAWL_PAGES.length;

  return (
    <div className="pt-card">
      <div className="pt-crawl">
        <div className="pt-crawl__ico">
          <Globe size={28} />
        </div>
        <h2 className="pt-crawl__title">
          {complete ? "Crawl complete" : "Crawling your site…"}
        </h2>
        <p className="pt-crawl__url">{domain}</p>
        <div className="pt-crawl__track">
          <div className="pt-crawl__fill" style={{ width: pct + "%" }} />
        </div>
        <div className="pt-crawl__log">
          {CRAWL_PAGES.map((p, i) => (
            <div
              key={p.page}
              className={"pt-crawl__line" + (i < done ? " is-done" : "")}
            >
              <span className="pt-crawl__dot">
                {i < done ? <Check size={11} /> : null}
              </span>
              {p.label}
              <span className="pt-crawl__page">
                {domain}
                {p.page}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
