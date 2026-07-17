"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Plane, Bookmark, CreditCard } from "lucide-react";
import { Tag } from "@/components/core/Tag";
import { Badge } from "@/components/core/Badge";
import { TierBadge } from "@/components/mk/TierBadge";
import { Rating } from "@/components/mk/Rating";
import { CostBand } from "@/components/mk/CostBand";
import { cn } from "@/lib/utils";
import type { MkSchool } from "@/lib/mk";

export interface SchoolCardProps {
  school: MkSchool;
  saved?: boolean;
  onToggleSave?: () => void;
}

/** The directory's primary result card. */
export function SchoolCard({ school: s, saved, onToggleSave }: SchoolCardProps) {
  const [imgError, setImgError] = React.useState(false);
  const loc = [s.city, s.state].filter(Boolean).join(", ");
  const showImg = s.image && !imgError;

  return (
    <Link className="ffs-school" href={`/schools/${s.id}`}>
      <div className="ffs-school__media">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.image as string}
            alt={s.name}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="ffs-school__fallback">
            <Plane />
          </div>
        )}
        <div className="ffs-school__tier">
          <TierBadge tier={s.tier} variant="solid" size="sm" />
        </div>
        {onToggleSave && (
          <button
            type="button"
            className={cn("ffs-school__save", saved && "is-saved")}
            aria-label={saved ? "Saved" : "Save school"}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <Bookmark />
          </button>
        )}
      </div>

      <div className="ffs-school__body">
        <h3 className="ffs-school__name">{s.name}</h3>
        <div className="ffs-school__loc">
          <MapPin />
          <span>{loc}</span>
          {s.airportCode && (
            <span className="ffs-school__code">· {s.airportCode}</span>
          )}
        </div>

        {s.programs.length > 0 && (
          <div className="ffs-school__tags">
            {s.programs.slice(0, 4).map((p) => (
              <Tag key={p}>{p}</Tag>
            ))}
            {s.programs.length > 4 && (
              <Tag tone="accent">+{s.programs.length - 4}</Tag>
            )}
          </div>
        )}

        <div className="ffs-school__divider" />

        <div className="ffs-school__row">
          {s.rating != null ? (
            <Rating value={s.rating} count={s.ratingCount} />
          ) : (
            <span
              style={{ fontSize: "var(--fs-xs)", color: "var(--text-faint)" }}
            >
              No reviews yet
            </span>
          )}
          {s.financing && (
            <Badge
              tone="success"
              variant="soft"
              size="sm"
              icon={<CreditCard size={13} />}
            >
              Financing
            </Badge>
          )}
        </div>

        {s.costBand && <CostBand band={s.costBand} range={s.costRange} />}

        {s.aircraft.length > 0 && (
          <div className="ffs-school__fleet">
            <Plane />
            <span>
              {s.aircraft.slice(0, 2).join(", ")}
              {s.aircraft.length > 2 ? ` +${s.aircraft.length - 2}` : ""}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
