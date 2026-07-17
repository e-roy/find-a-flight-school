"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Mail,
  Bookmark,
  Columns2,
  GraduationCap,
  Plane,
  DollarSign,
  CreditCard,
  Clock,
  Banknote,
  Percent,
  Globe,
  Phone,
} from "lucide-react";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { Tag } from "@/components/core/Tag";
import { Badge } from "@/components/core/Badge";
import { TierBadge } from "@/components/mk/TierBadge";
import { Rating } from "@/components/mk/Rating";
import { CostBand } from "@/components/mk/CostBand";
import { Img } from "@/components/mk/Img";
import {
  LiveMap,
  PhotosCard,
  OpeningHoursCard,
  SchoolDetailsCard,
} from "@/components/mk/ProfileExtras";
import { useMkState } from "@/components/mk/use-mk-state";
import { mkTier, costRangeLabel } from "@/lib/mk";
import { parseSnapshot } from "@/lib/snapshot";
import { submitFinancingIntent } from "@/lib/utils-financing";
import type { Band } from "@/components/mk/CostBand";
import type { schools } from "@/db/schema/schools";
import type { snapshots } from "@/db/schema/snapshots";
import type { OrganizedFacts } from "@/lib/utils-facts";
import type { FinancingInfo } from "@/lib/utils-financing";
import { formatAsOfDate, cn } from "@/lib/utils";

type School = typeof schools.$inferSelect;

interface FactRow {
  factKey: string;
  provenance: string;
  asOf: Date;
  isStale: boolean;
}

const FACT_LABELS: Record<string, string> = {
  "cost.band": "Expected total cost",
  "cost.notes": "Pricing notes",
  "fleet.aircraft": "Fleet & aircraft",
  "fleet.count": "Fleet size",
  "program.type": "Programs offered",
  "rating.value": "Rating & reviews",
  "rating.count": "Review count",
  "location.airport_code": "Airport",
  "location.address": "Location",
  "contact.phone": "Contact phone",
  "contact.email": "Contact email",
  photos: "Photos",
  opening_hours: "Opening hours",
};

function humanizeKey(key: string): string {
  return (
    FACT_LABELS[key] ||
    key.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export interface SchoolProfileViewProps {
  school: School;
  facts: OrganizedFacts;
  rawFacts: FactRow[];
  signals?: { trainingVelocity: number | null; scheduleReliability: number | null } | null;
  financing: FinancingInfo | null;
  snapshot?: typeof snapshots.$inferSelect | null;
  recentlyUpdated?: boolean;
  claimed?: boolean;
  onFinancingClick?: () => void;
}

export function SchoolProfileView({
  school,
  facts,
  rawFacts,
  signals,
  financing,
  snapshot,
  recentlyUpdated,
  claimed,
  onFinancingClick,
}: SchoolProfileViewProps) {
  const { isAuthed, isSaved, toggleSave, isComparing, toggleCompare } = useMkState();

  const addr = (school.addrStd ?? {}) as Record<string, unknown>;
  const city = typeof addr.city === "string" ? addr.city : undefined;
  const state = typeof addr.state === "string" ? addr.state : undefined;
  const loc = [city, state].filter(Boolean).join(", ");
  const tier = mkTier(signals, claimed);
  const band = (facts.costBand as Band | undefined) ?? undefined;
  // Banner uses a real photo only — a tiny favicon would look bad stretched 21:6.
  const bannerImage =
    facts.photos && facts.photos.length > 0 ? facts.photos[0] : null;

  // The normalized facts table is often sparse; fall back to the latest
  // snapshot's richer scraped data so we surface as much as possible.
  const snap = parseSnapshot(snapshot);
  const programs =
    facts.programs.length > 0 ? facts.programs : snap?.programs ?? [];
  const fleetAircraft =
    facts.fleetAircraft && facts.fleetAircraft.length > 0
      ? facts.fleetAircraft
      : snap?.fleet ?? [];
  const fleetCount = facts.fleetCount ?? (fleetAircraft.length || undefined);
  const timelineText = snap?.timelineText ?? null;
  const photos = facts.photos ?? [];
  const partTags = (snap?.trainingType ?? []).filter((t) => /part/i.test(t));
  const blurb = snap?.description ?? null;
  const coords =
    facts.coordinates ??
    (school.lat != null && school.lng != null
      ? { lat: school.lat, lng: school.lng }
      : null);

  const saved = isAuthed && isSaved(school.id);
  const comparing = isComparing(school.id);
  const website = school.domain
    ? school.domain.startsWith("http")
      ? school.domain
      : `https://${school.domain}`
    : undefined;
  const email = facts.email;

  // Evidence: latest fact per key
  const evidence = rawFacts
    .filter((f) => !f.isStale)
    .slice(0, 8)
    .map((f) => ({
      fact: humanizeKey(f.factKey),
      source: f.provenance || "Crawl",
      asOf: formatAsOfDate(f.asOf),
    }));

  return (
    <div className="mk-profile">
      <div className="mk-profile__hero">
        <div className="mk-shell">
          <Link className="mk-back" href="/search">
            <ChevronLeft size={16} /> Back to search
          </Link>
          <div className="mk-profile__heroin">
            <div className="mk-profile__heromain">
              <div className="mk-profile__badges">
                <TierBadge tier={tier} variant="solid" />
                {partTags.length > 0
                  ? partTags.map((p) => (
                      <Tag key={p} tone="sky">
                        {p}
                      </Tag>
                    ))
                  : programs.length > 0 && (
                      <Tag tone="sky">{programs.length} programs</Tag>
                    )}
                {recentlyUpdated && (
                  <Badge tone="success" variant="soft" size="sm">
                    Recently updated
                  </Badge>
                )}
              </div>
              <h1 className="mk-profile__name">{school.canonicalName}</h1>
              <div className="mk-profile__meta">
                {loc && (
                  <span>
                    <MapPin size={16} /> {loc}
                  </span>
                )}
                {facts.airportCode && (
                  <span className="mk-mono">{facts.airportCode}</span>
                )}
                {facts.rating != null && (
                  <Rating value={facts.rating} count={facts.ratingCount} />
                )}
              </div>
              {blurb && <p className="mk-profile__blurb">{blurb}</p>}
            </div>
            <div className="mk-profile__heroactions">
              {email ? (
                <a
                  className="ffs-btn ffs-btn--primary ffs-btn--lg"
                  href={`mailto:${email}`}
                >
                  <Mail size={18} /> Contact school
                </a>
              ) : website ? (
                <a
                  className="ffs-btn ffs-btn--primary ffs-btn--lg"
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Mail size={18} /> Contact school
                </a>
              ) : (
                <Button variant="primary" size="lg" leftIcon={<Mail size={18} />}>
                  Contact school
                </Button>
              )}
              <div className="mk-profile__heroactions2">
                <Button
                  variant="secondary"
                  leftIcon={<Bookmark size={16} fill={saved ? "currentColor" : "none"} />}
                  onClick={() => toggleSave(school.id)}
                >
                  {saved ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="secondary"
                  className={cn(comparing && "is-comparing")}
                  leftIcon={<Columns2 size={16} />}
                  onClick={() => toggleCompare(school.id)}
                >
                  {comparing ? "Comparing" : "Compare"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mk-shell mk-profile__body">
        <div className="mk-profile__banner">
          <Img
            dark
            ratio="21 / 6"
            radius={14}
            label="School photo"
            src={bannerImage}
            alt={school.canonicalName}
          />
        </div>
        <div className="mk-profile__cols">
          <main className="mk-profile__left">
            <div className="mk-quickfacts">
              <Fact icon={<DollarSign size={18} />} label="Expected total cost">
                {band ? (
                  <CostBand band={band} range={costRangeLabel(band)} showMeter={false} />
                ) : (
                  <span className="mk-fact__sub">Not listed</span>
                )}
              </Fact>
              <Fact icon={<Clock size={18} />} label="Typical timeline">
                {timelineText ? (
                  <span className="mk-fact__big">{timelineText}</span>
                ) : (
                  <span className="mk-fact__sub">Not listed</span>
                )}
              </Fact>
              <Fact icon={<Plane size={18} />} label="Fleet">
                <span className="mk-fact__big">{fleetCount ?? "—"}</span>
                <span className="mk-fact__sub">aircraft</span>
              </Fact>
              <Fact icon={<CreditCard size={18} />} label="Financing">
                {financing?.available ? (
                  <Badge tone="success" variant="soft" size="sm" icon={<CreditCard size={13} />}>
                    Available
                  </Badge>
                ) : (
                  <span className="mk-fact__sub">Not listed</span>
                )}
              </Fact>
            </div>

            {programs.length > 0 && (
              <Card className="mk-block">
                <span className="mk-card__title">
                  <GraduationCap size={18} /> Programs &amp; ratings
                </span>
                <div className="mk-block__tags">
                  {programs.map((p) => (
                    <Tag key={p}>{p}</Tag>
                  ))}
                </div>
                <p className="mk-block__note">
                  Training programs as published by the school and verified
                  against our crawl. Availability and prerequisites vary.
                </p>
              </Card>
            )}

            {fleetAircraft.length > 0 && (
              <Card className="mk-block">
                <span className="mk-card__title">
                  <Plane size={18} /> Fleet &amp; aircraft
                </span>
                <div className="mk-fleet">
                  {fleetAircraft.map((a) => (
                    <div className="mk-fleet__item" key={a}>
                      <span className="mk-fleet__icon">
                        <Plane size={18} />
                      </span>
                      <span className="mk-fleet__name">{a}</span>
                    </div>
                  ))}
                </div>
                {fleetCount && (
                  <p className="mk-block__note">{fleetCount} aircraft total.</p>
                )}
              </Card>
            )}

            {snap && <SchoolDetailsCard details={snap} />}

            {photos.length > 0 && (
              <PhotosCard photos={photos} schoolName={school.canonicalName} />
            )}

            {(band || facts.costNotes) && (
              <Card className="mk-block">
                <span className="mk-card__title">
                  <DollarSign size={18} /> Pricing
                </span>
                {band && <CostBand band={band} range={costRangeLabel(band)} />}
                <p className="mk-block__note">
                  {facts.costNotes ||
                    "Expected total cost is a normalized band across aircraft rental, instruction, materials, and checkride fees. Actual cost varies with training pace."}
                </p>
              </Card>
            )}

            {financing?.available && (
              <Card className="mk-block mk-finblock">
                <div className="mk-finblock__head">
                  <span className="mk-card__title">
                    <Banknote size={18} /> Financing options
                  </span>
                  <Badge tone="success" variant="soft" size="sm" icon={<CreditCard size={13} />}>
                    Available
                  </Badge>
                </div>
                <div className="mk-finblock__row">
                  <div>
                    <span className="mk-finblock__label">Estimated from</span>
                    <span className="mk-finblock__val">
                      {costRangeLabel(band) ? "Payment plans" : "Plans available"}
                    </span>
                  </div>
                  {financing.types.length > 0 && (
                    <div>
                      <span className="mk-finblock__label">Plan types</span>
                      <div className="mk-finblock__tags">
                        {financing.types.map((t) => (
                          <Tag key={t} tone="sky">
                            {t}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <p className="mk-block__note">
                  Final rate and term are set by the lender after
                  pre-qualification.
                </p>
                {financing.url ? (
                  <a
                    className="ffs-btn ffs-btn--navy"
                    href={financing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => void submitFinancingIntent(school.id)}
                  >
                    <Percent size={16} /> Check financing options
                  </a>
                ) : (
                  <Button
                    variant="navy"
                    leftIcon={<Percent size={16} />}
                    onClick={onFinancingClick}
                  >
                    Check financing options
                  </Button>
                )}
              </Card>
            )}
          </main>

          <aside className="mk-profile__right">
            <Card className="mk-block">
              <span className="mk-card__title">
                <MapPin size={18} /> Location &amp; contact
              </span>
              {coords ? (
                <LiveMap lat={coords.lat} lng={coords.lng} name={school.canonicalName} />
              ) : (
                <div className="mk-map">
                  <MapPin size={26} style={{ color: "var(--sky)" }} />
                </div>
              )}
              <div className="mk-contact">
                {loc && (
                  <span className="mk-contact__row">
                    <MapPin size={16} /> {loc}
                    {facts.airportCode ? ` · ${facts.airportCode}` : ""}
                  </span>
                )}
                {(facts.phone || school.phone) && (
                  <a className="mk-contact__row" href={`tel:${facts.phone || school.phone}`}>
                    <Phone size={16} /> {facts.phone || school.phone}
                  </a>
                )}
                {website && (
                  <a
                    className="mk-contact__row"
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe size={16} /> {school.domain}
                  </a>
                )}
              </div>
              {email ? (
                <a
                  className="ffs-btn ffs-btn--navy ffs-btn--full"
                  href={`mailto:${email}`}
                >
                  <Mail size={16} /> Request info
                </a>
              ) : (
                <Button variant="navy" fullWidth leftIcon={<Mail size={16} />}>
                  Request info
                </Button>
              )}
            </Card>

            {facts.openingHours && <OpeningHoursCard hours={facts.openingHours} />}

            <Card padding="none" className="mk-evidence">
              <div className="mk-evidence__head">
                <span className="mk-card__title">Evidence</span>
                <Badge tone="neutral" variant="soft" size="sm">
                  {evidence.length} sources
                </Badge>
              </div>
              <div className="mk-evidence__list">
                {evidence.map((r, i) => (
                  <div className="mk-evidence__row" key={i}>
                    <div>
                      <span className="mk-evidence__fact">{r.fact}</span>
                      <span className="mk-evidence__src">{r.source}</span>
                    </div>
                    <span className="mk-evidence__date">{r.asOf}</span>
                  </div>
                ))}
                {evidence.length === 0 && (
                  <div className="mk-evidence__row">
                    <span className="mk-evidence__src">No sources recorded yet.</span>
                  </div>
                )}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-fact">
      <span className="mk-fact__icon">{icon}</span>
      <div>
        <span className="mk-fact__label">{label}</span>
        <div className="mk-fact__value">{children}</div>
      </div>
    </div>
  );
}
