"use client";

import Link from "next/link";
import { Shield, ChevronLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button, buttonClass } from "@/components/core/Button";
import { SrcChip } from "@/components/mk/portal-bits";

export interface PlaceData {
  placeId: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
}

const FIELDS: { key: keyof PlaceData; label: string; mono?: boolean }[] = [
  { key: "name", label: "School name" },
  { key: "address", label: "Address" },
  { key: "phone", label: "Phone", mono: true },
  { key: "website", label: "Website", mono: true },
];

export function Preview({
  place,
  onBack,
  onSubmit,
  submitting,
}: {
  place: PlaceData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const rating =
    place.rating != null
      ? `${place.rating} ★ · ${place.ratingCount ?? 0} reviews`
      : null;

  return (
    <>
      <div className="pt-callout" style={{ marginBottom: 18 }}>
        <span className="pt-callout__icon">
          <Shield size={20} />
        </span>
        <div>
          <p className="pt-callout__title">We pulled the basics from Google</p>
          <p className="pt-callout__text">
            These details come straight from Google and can&apos;t be edited
            here — only the school can change them, by claiming the listing
            with a work email on its domain. We verify and enrich the rest
            after you submit — full program, fleet, and pricing details come
            from a crawl of the school&apos;s site.
          </p>
        </div>
      </div>

      <div className="pt-card">
        {FIELDS.map((f) => {
          const value = (place[f.key] as string) || "";
          return (
            <div className="pt-field" key={f.key}>
              <span className="pt-field__label">
                <span className="pt-field__name">{f.label}</span>
              </span>
              <div className="pt-field__main">
                <div className="pt-field__row">
                  <span className={"pt-field__val" + (f.mono ? " is-mono" : "")}>
                    {value || (
                      <span style={{ color: "var(--text-faint)" }}>—</span>
                    )}
                  </span>
                </div>
                <div className="pt-field__meta">
                  <SrcChip source="google" />
                  <span className="pt-field__page">Google Places</span>
                </div>
              </div>
            </div>
          );
        })}
        {rating && (
          <div className="pt-field">
            <span className="pt-field__label">
              <span className="pt-field__name">Google rating</span>
            </span>
            <div className="pt-field__main">
              <div className="pt-field__row">
                <span className="pt-field__val is-mono">{rating}</span>
              </div>
              <div className="pt-field__meta">
                <SrcChip source="google" />
                <span className="pt-field__page">Google Places</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-actions">
        <Button
          variant="ghost"
          onClick={onBack}
          leftIcon={<ChevronLeft size={16} />}
        >
          Back to search
        </Button>
        <div className="pt-actions__right">
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={submitting}
            rightIcon={
              submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )
            }
          >
            {submitting ? "Submitting…" : "Submit to directory"}
          </Button>
        </div>
      </div>
    </>
  );
}

export function Submitted({
  name,
  schoolId,
  isNew = true,
  domain,
  onAddAnother,
}: {
  name: string;
  schoolId: string | null;
  isNew?: boolean;
  domain?: string;
  onAddAnother: () => void;
}) {
  return (
    <div className="pt-card">
      <div className="pt-done">
        <div className="pt-done__mark">
          <Check size={32} />
        </div>
        <h2 className="pt-done__title">
          {isNew ? `${name} is on the map` : `${name} is already listed`}
        </h2>
        <p className="pt-done__text">
          {isNew ? (
            <>
              Thanks — no account needed. It&apos;s listed now and searchable
              right away as <b>Unverified</b>, built from Google data. We crawl
              the school&apos;s site to fill in programs, fleet, and pricing.
            </>
          ) : (
            <>
              Good news — this school is already in our directory. Head to its
              profile to see the details, save it, or compare it.
            </>
          )}
        </p>
        {schoolId && (
          <div style={{ marginTop: 18 }}>
            <Link
              href={`/schools/${schoolId}`}
              className={buttonClass(isNew ? "secondary" : "primary", "lg")}
            >
              Go to the school <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>

      {isNew && (
        <div className="pt-callout pt-callout--amber" style={{ marginTop: 4 }}>
          <span className="pt-callout__icon">
            <Shield size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <p className="pt-callout__title">Work at {name}?</p>
            <p className="pt-callout__text">
              Only the school can verify its own listing. Sign in with an email
              at <b>@{domain || "your school's domain"}</b> to claim it, confirm
              the details, and earn a verified badge.
            </p>
            <div style={{ marginTop: 12 }}>
              <Link href="/claim" className={buttonClass("primary", "sm")}>
                <Shield size={15} /> Verify with my work email
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="pt-actions" style={{ justifyContent: "center", gap: 10 }}>
        <Button variant="secondary" onClick={onAddAnother}>
          Add another school
        </Button>
        <Link href="/search" className={buttonClass("ghost", "md")}>
          Back to search <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
