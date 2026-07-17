"use client";

import * as React from "react";
import { Camera, Clock, Users, Monitor, Building2, MapPin, Check, X, ImageIcon } from "lucide-react";
import { Card } from "@/components/core/Card";
import { Tag } from "@/components/core/Tag";
import { GoogleMapEmbed } from "@/components/schools/GoogleMapEmbed";
import { Lightbox } from "@/components/mk/Lightbox";
import type { SnapshotDetails } from "@/lib/snapshot";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function fmtTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const m = minute ? minute.toString().padStart(2, "0") : "00";
  return `${h}:${m} ${period}`;
}

export function LiveMap({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  return (
    <div className="mk-map mk-map--live">
      <GoogleMapEmbed lat={lat} lng={lng} schoolName={name} />
    </div>
  );
}

export function PhotosCard({
  photos,
  schoolName,
}: {
  photos: string[];
  schoolName: string;
}) {
  const valid = photos.filter((p) => p && p.trim().length > 0);
  const shown = valid.slice(0, 6);
  const extra = valid.length - shown.length;
  const [errored, setErrored] = React.useState<Set<number>>(new Set());
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const tileRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  if (shown.length === 0) return null;
  if (errored.size >= shown.length) return null;
  return (
    <Card className="mk-block">
      <span className="mk-card__title">
        <Camera size={18} /> Photos
      </span>
      <div className="mk-photos">
        {shown.map((p, i) =>
          errored.has(i) ? (
            <span className="mk-photos__broken" key={`${p}-${i}`}>
              <ImageIcon size={22} />
            </span>
          ) : (
            <button
              key={`${p}-${i}`}
              type="button"
              className="mk-photos__tile"
              aria-label={`View photo ${i + 1} of ${valid.length}`}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              onClick={() => {
                setLightboxIndex(i);
                setLightboxOpen(true);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p}
                alt={`${schoolName} photo ${i + 1}`}
                loading="lazy"
                onError={() =>
                  setErrored((prev) => new Set(prev).add(i))
                }
              />
              {extra > 0 && i === shown.length - 1 && (
                <span className="mk-photos__more">+{extra}</span>
              )}
            </button>
          )
        )}
      </div>
      <Lightbox
        photos={valid}
        schoolName={schoolName}
        open={lightboxOpen}
        index={lightboxIndex}
        onOpenChange={setLightboxOpen}
        onIndexChange={setLightboxIndex}
        onCloseAutoFocus={(e) => {
          const tile =
            tileRefs.current[Math.min(lightboxIndex, shown.length - 1)];
          if (tile) {
            e.preventDefault();
            tile.focus();
          }
        }}
      />
    </Card>
  );
}

export interface OpeningHours {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close: { day: number; hour: number; minute: number };
  }>;
  weekdayText?: string[];
}

export function OpeningHoursCard({ hours }: { hours: OpeningHours }) {
  const { openNow, periods, weekdayText } = hours;
  if (!weekdayText?.length && !periods?.length) return null;
  return (
    <Card className="mk-block">
      <span className="mk-card__title">
        <Clock size={18} /> Opening hours
      </span>
      {openNow !== undefined && (
        <div className="mk-detail__v" style={{ marginTop: -4 }}>
          {openNow ? (
            <span style={{ color: "var(--success)", fontWeight: 600 }}>Open now</span>
          ) : (
            <span style={{ color: "var(--danger)", fontWeight: 600 }}>Closed</span>
          )}
        </div>
      )}
      <div className="mk-hours">
        {weekdayText?.length
          ? weekdayText.map((t, i) => (
              <span className="mk-hours__row" key={i}>
                {t}
              </span>
            ))
          : periods?.map((p, i) => (
              <span className="mk-hours__row" key={i}>
                <strong>{DAYS[p.open.day] ?? `Day ${p.open.day}`}:</strong>{" "}
                {fmtTime(p.open.hour, p.open.minute)} –{" "}
                {fmtTime(p.close?.hour ?? 0, p.close?.minute ?? 0)}
              </span>
            ))}
      </div>
    </Card>
  );
}

export function SchoolDetailsCard({ details }: { details: SnapshotDetails }) {
  const { trainingType, simulatorAvailable, instructorCount, locations, timelineText } = details;
  const hasData =
    trainingType.length > 0 ||
    simulatorAvailable !== null ||
    !!instructorCount ||
    locations.length > 0 ||
    !!timelineText;
  if (!hasData) return null;

  return (
    <Card className="mk-block">
      <span className="mk-card__title">
        <Building2 size={18} /> School details
      </span>
      <div className="mk-detail">
        {timelineText && (
          <div className="mk-detail__row">
            <span className="mk-detail__k">Typical timeline</span>
            <span className="mk-detail__v">
              <Clock size={15} /> {timelineText}
            </span>
          </div>
        )}
        {trainingType.length > 0 && (
          <div className="mk-detail__row">
            <span className="mk-detail__k">Training format</span>
            <div className="mk-detail__v">
              {trainingType.map((t) => (
                <Tag key={t} tone="sky">
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {instructorCount && (
          <div className="mk-detail__row">
            <span className="mk-detail__k">Instructors</span>
            <span className="mk-detail__v">
              <Users size={15} /> {instructorCount}
            </span>
          </div>
        )}
        {simulatorAvailable !== null && (
          <div className="mk-detail__row">
            <span className="mk-detail__k">Flight simulator</span>
            <span className="mk-detail__v">
              {simulatorAvailable ? (
                <>
                  <Check size={15} style={{ color: "var(--success)" }} /> Available
                </>
              ) : (
                <>
                  <X size={15} style={{ color: "var(--text-faint)" }} /> Not available
                </>
              )}
              {simulatorAvailable && <Monitor size={15} />}
            </span>
          </div>
        )}
        {locations.length > 0 && (
          <div className="mk-detail__row">
            <span className="mk-detail__k">Locations</span>
            <div className="mk-detail__v" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              {locations.map((l, i) => (
                <span key={i} style={{ display: "inline-flex", gap: 6 }}>
                  <MapPin size={15} style={{ color: "var(--text-faint)" }} />
                  {[l.address, l.city, l.state].filter(Boolean).join(", ") ||
                    l.airportCode}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
