"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
  MapPin,
  Globe,
  Plane,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button, buttonClass } from "@/components/core/Button";
import { trpc } from "@/lib/trpc/client";
import { parseSnapshot } from "@/lib/snapshot";
import { highlightJSON } from "@/lib/json-highlight";

export interface AdminSchoolRow {
  id: string;
  canonicalName: string;
  domain: string | null;
  addrStd: unknown;
  crawlStatus: string | null;
  crawlUpdatedAt: Date | string | null;
  crawlError: string | null;
  lastScraped: Date | string | null;
}

function fmtDateTime(v: Date | string | null): string {
  if (!v) return "Never";
  const d = new Date(v);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export function StatusChip({
  status,
  stale,
  error,
}: {
  status: string;
  stale?: boolean;
  error?: string | null;
}) {
  if (stale) return <span className="mk-status mk-status--stale">Stale · re-crawl</span>;
  if (status === "failed") {
    // Hover shows why the last crawl failed.
    return (
      <span className="mk-status mk-status--failed" title={error || undefined}>
        Failed · retry
      </span>
    );
  }
  const label =
    status === "published" ? "Published" : status === "crawling" ? "Crawling" : "Discovered";
  return <span className={`mk-status mk-status--${status}`}>{label}</span>;
}

export function ConfirmDialog({
  name,
  onCancel,
  onConfirm,
}: {
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mk-confirm__scrim" onClick={onCancel}>
      <div className="mk-confirm" onClick={(e) => e.stopPropagation()}>
        <div className="mk-confirm__icon mk-confirm__icon--danger">
          <Trash2 size={22} />
        </div>
        <h2 className="mk-confirm__title">Delete {name}?</h2>
        <p className="mk-confirm__text">
          This permanently removes the school <b>and its crawl snapshots</b>.
          This can&apos;t be undone.
        </p>
        <div className="mk-confirm__actions">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" className="mk-btn-dangerfill" onClick={onConfirm}>
            Delete data
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SchoolDrawer({
  school,
  status,
  stale,
  crawling,
  crawlDisabled = false,
  onClose,
  onCrawl,
  onDelete,
}: {
  school: AdminSchoolRow;
  status: string;
  stale: boolean;
  crawling: boolean;
  /** Disable the crawl button because a crawl is running elsewhere (crawls are serialized). */
  crawlDisabled?: boolean;
  onClose: () => void;
  onCrawl: () => void;
  onDelete: () => void;
}) {
  const [raw, setRaw] = React.useState(false);
  const { data: snaps } = trpc.snapshots.bySchoolId.useQuery({
    schoolId: school.id,
    limit: 1,
  });
  const snap = snaps?.[0] ?? null;
  const details = parseSnapshot(snap as never);
  const addr = (school.addrStd ?? {}) as Record<string, unknown>;
  const loc = [addr.city, addr.state].filter((x) => typeof x === "string").join(", ");

  return (
    <div className="mk-drawer__scrim" onClick={onClose}>
      <aside className="mk-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mk-drawer__head">
          <button className="mk-iconbtn mk-drawer__close" onClick={onClose}>
            <X size={18} />
          </button>
          <StatusChip status={status} stale={stale} error={school.crawlError} />
          <h2 className="mk-drawer__name">{school.canonicalName}</h2>
          <div className="mk-drawer__meta">
            {loc && (
              <span>
                <MapPin size={14} /> {loc}
              </span>
            )}
            {school.domain && (
              <span>
                <Globe size={14} /> {school.domain}
              </span>
            )}
          </div>
        </div>

        <div className="mk-drawer__body">
          <div className="mk-drawer__sec">
            <span className="mk-drawer__sech">Record</span>
            <div className="mk-rev">
              <span className="mk-rev__label">Last crawl</span>
              <span className="mk-rev__val">{fmtDateTime(school.lastScraped)}</span>
            </div>
            <div className="mk-rev">
              <span className="mk-rev__label">Domain</span>
              <span className="mk-rev__val">{school.domain || "—"}</span>
            </div>
          </div>

          {snap ? (
            <div className="mk-drawer__sec">
              <span className="mk-drawer__sech">Crawl snapshot</span>
              <div className="mk-sourcesplit">
                <div className="mk-sourcecard">
                  <div className="mk-sourcecard__n">
                    {details?.fleet.length ?? 0}
                  </div>
                  <div className="mk-sourcecard__l">
                    <Plane size={13} /> Fleet
                  </div>
                </div>
                <div className="mk-sourcecard">
                  <div className="mk-sourcecard__n">
                    {details?.programs.length ?? 0}
                  </div>
                  <div className="mk-sourcecard__l">
                    <Check size={13} /> Programs
                  </div>
                </div>
              </div>
              <div className="mk-rev">
                <span className="mk-rev__label">Snapshot ID</span>
                <span
                  className="mk-rev__val"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)" }}
                >
                  {snap.id}
                </span>
              </div>
              {details && details.programs.length > 0 && (
                <div className="mk-rev">
                  <span className="mk-rev__label">Programs</span>
                  <span className="mk-rev__val">
                    <div className="pt-tags">
                      {details.programs.map((p) => (
                        <span className="pt-tag" key={p}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </span>
                </div>
              )}
              <button className="mk-rawtoggle" onClick={() => setRaw(!raw)}>
                <ChevronRight
                  size={14}
                  style={{ transform: raw ? "rotate(90deg)" : "none" }}
                />{" "}
                {raw ? "Hide" : "View"} raw JSON snapshot
              </button>
              {raw && (
                <div className="pt-code" style={{ marginTop: 10 }}>
                  <pre
                    dangerouslySetInnerHTML={{
                      __html: highlightJSON(snap.rawJson),
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="mk-drawer__sec">
              <span className="mk-drawer__sech">Crawl snapshot</span>
              <div className="pt-callout pt-callout--amber">
                <span className="pt-callout__icon">
                  <Globe size={20} />
                </span>
                <div>
                  <p className="pt-callout__title">Not crawled yet</p>
                  <p className="pt-callout__text">
                    Crawl {school.domain || "this school"} to extract programs,
                    fleet, and pricing — it publishes to the directory.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mk-drawer__foot">
          <Button
            variant="secondary"
            className="mk-btn-danger"
            onClick={onDelete}
            leftIcon={<Trash2 size={16} />}
          >
            Delete data
          </Button>
          <Link
            href={`/schools/${school.id}`}
            target="_blank"
            className={buttonClass("ghost", "md")}
          >
            <ExternalLink size={16} /> Profile
          </Link>
          <Button
            variant="primary"
            style={{ flex: 1.4 }}
            disabled={crawling || crawlDisabled || !school.domain}
            onClick={onCrawl}
            leftIcon={<RefreshCw size={16} />}
          >
            {crawling
              ? "Crawling…"
              : status === "published"
                ? "Re-crawl"
                : status === "failed"
                  ? "Retry crawl"
                  : "Crawl & publish"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
