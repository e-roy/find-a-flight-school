"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Plane, X, Search as SearchIcon, ArrowRight, Check, Columns2 } from "lucide-react";
import { Button, buttonClass } from "@/components/core/Button";
import { Tag } from "@/components/core/Tag";
import { Badge } from "@/components/core/Badge";
import { TierBadge } from "@/components/mk/TierBadge";
import { Rating } from "@/components/mk/Rating";
import { CostBand } from "@/components/mk/CostBand";
import { useMkState } from "@/components/mk/use-mk-state";
import { cn } from "@/lib/utils";
import type { MkSchool } from "@/lib/mk";

const COST_ORDER: Record<string, number> = { LOW: 0, MID: 1, HIGH: 2 };

export interface CompareTableViewProps {
  schools: MkSchool[];
}

export function CompareTableView({ schools }: CompareTableViewProps) {
  const router = useRouter();
  const { toggleCompare } = useMkState();
  const cols = schools.slice(0, 4);
  const slots = Math.max(0, 4 - cols.length);

  const minCost = cols.reduce(
    (m, s) => Math.min(m, COST_ORDER[s.costBand ?? "HIGH"] ?? 99),
    99
  );
  const bestId = cols.find((s) => (COST_ORDER[s.costBand ?? "HIGH"] ?? 99) === minCost)?.id;

  const rows: {
    key: string;
    label: string;
    cell: (s: MkSchool) => React.ReactNode;
    highlight?: (s: MkSchool) => boolean;
  }[] = [
    { key: "tier", label: "Trust tier", cell: (s) => <TierBadge tier={s.tier} /> },
    {
      key: "loc",
      label: "Location",
      cell: (s) => (
        <span className="mk-ct__loc">
          <MapPin size={15} /> {[s.city, s.state].filter(Boolean).join(", ")}
          {s.airportCode && <span className="mk-mono">· {s.airportCode}</span>}
        </span>
      ),
    },
    {
      key: "rating",
      label: "Rating",
      cell: (s) =>
        s.rating != null ? (
          <Rating value={s.rating} count={s.ratingCount} />
        ) : (
          <span className="mk-ct__none">No reviews yet</span>
        ),
    },
    {
      key: "cost",
      label: "Expected total cost",
      cell: (s) =>
        s.costBand ? (
          <div className="mk-ct__coststack">
            <CostBand band={s.costBand} range={s.costRange} />
            {s.id === bestId && cols.length > 1 && (
              <Badge tone="success" variant="soft" size="sm" icon={<Check size={12} />}>
                Best value
              </Badge>
            )}
          </div>
        ) : (
          <span className="mk-ct__none">Not listed</span>
        ),
      highlight: (s) => s.id === bestId && cols.length > 1 && !!s.costBand,
    },
    {
      key: "programs",
      label: "Programs",
      cell: (s) =>
        s.programs.length > 0 ? (
          <div className="mk-ct__tags">
            {s.programs.map((p) => (
              <Tag key={p}>{p}</Tag>
            ))}
          </div>
        ) : (
          <span className="mk-ct__none">—</span>
        ),
    },
    {
      key: "fleet",
      label: "Fleet",
      cell: (s) =>
        s.aircraft.length > 0 || s.fleetCount ? (
          <div className="mk-ct__fleet">
            <span className="mk-ct__big">
              {s.fleetCount ?? s.aircraft.length} aircraft
            </span>
            {s.aircraft.length > 0 && (
              <span className="mk-ct__sub">{s.aircraft.join(", ")}</span>
            )}
          </div>
        ) : (
          <span className="mk-ct__none">—</span>
        ),
    },
    {
      key: "financing",
      label: "Financing",
      cell: (s) =>
        s.financing ? (
          <Badge tone="success" variant="soft" size="sm" icon={<Check size={12} />}>
            Available
          </Badge>
        ) : (
          <span className="mk-ct__none">Not listed</span>
        ),
    },
  ];

  const gridCols = `184px repeat(${cols.length + slots}, minmax(190px, 1fr))`;

  return (
    <div className="mk-shell mk-compare">
      <div className="mk-compare__head">
        <div>
          <span className="mk-eyebrow">Compare</span>
          <h1 className="mk-plain__title">
            {cols.length} school{cols.length === 1 ? "" : "s"} side by side
          </h1>
        </div>
        <Link href="/search" className={buttonClass("secondary", "md")}>
          <SearchIcon size={16} /> Add from search
        </Link>
      </div>

      {cols.length === 0 ? (
        <div className="mk-compare__empty">
          <Columns2 size={32} style={{ color: "var(--text-faint)" }} />
          <p>No schools selected yet.</p>
          <Button variant="primary" onClick={() => router.push("/search")}>
            Find schools to compare
          </Button>
        </div>
      ) : (
        <div className="mk-compare__scroll">
          <div className="mk-ct" style={{ gridTemplateColumns: gridCols }}>
            <div className="mk-ct__corner" />
            {cols.map((s) => (
              <div className="mk-ct__col-head" key={s.id}>
                <button
                  className="mk-ct__remove"
                  onClick={() => toggleCompare(s.id)}
                  aria-label="Remove"
                >
                  <X size={15} />
                </button>
                <div className="mk-ct__thumb">
                  <Plane size={26} />
                </div>
                <Link className="mk-ct__name" href={`/schools/${s.id}`}>
                  {s.name}
                </Link>
                <Link
                  href={`/schools/${s.id}`}
                  className={buttonClass("primary", "sm", true)}
                >
                  View profile
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
            {Array.from({ length: slots }).map((_, i) => (
              <Link key={`slot${i}`} href="/search" className="mk-ct__addcol">
                <SearchIcon size={20} />
                <span>Add a school</span>
              </Link>
            ))}

            {rows.map((r) => (
              <React.Fragment key={r.key}>
                <div className="mk-ct__rowlabel">{r.label}</div>
                {cols.map((s) => (
                  <div
                    className={cn("mk-ct__cell", r.highlight?.(s) && "is-best")}
                    key={s.id}
                  >
                    {r.cell(s)}
                  </div>
                ))}
                {Array.from({ length: slots }).map((_, i) => (
                  <div className="mk-ct__cell mk-ct__cell--empty" key={`e${i}`} />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
