"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  Search,
  RefreshCw,
  ChevronRight,
  MapPin,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/core/Button";
import { Input } from "@/components/core/Input";
import { DiscoverView } from "@/components/admin/DiscoverView";
import { PublicAdditionsView } from "@/components/admin/PublicAdditionsView";
import { useCrawlLock } from "@/components/admin/CrawlLockContext";
import { STALE_CRAWL_MS } from "@/lib/crawl-constants";
import {
  SchoolDrawer,
  ConfirmDialog,
  StatusChip,
  type AdminSchoolRow,
} from "@/components/admin/SchoolDrawer";

type Row = AdminSchoolRow & { googlePlaceId: string | null };

// Synchronous crawls finish within minutes; a pending/processing row older than
// STALE_CRAWL_MS means the server died mid-crawl, so fall back to "pending" to
// keep the crawl button available instead of showing "Crawling…" forever.
function deriveStatus(
  crawlStatus: string | null,
  crawlUpdatedAt: Date | string | null
): "published" | "crawling" | "pending" | "failed" {
  if (crawlStatus === "completed") return "published";
  if (crawlStatus === "failed") return "failed";
  if (crawlStatus === "processing" || crawlStatus === "pending") {
    const age = crawlUpdatedAt
      ? Date.now() - new Date(crawlUpdatedAt).getTime()
      : Infinity;
    if (age < STALE_CRAWL_MS) return "crawling";
  }
  return "pending";
}
function daysSince(v: Date | string | null): number {
  if (!v) return Infinity;
  return Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
}
function fmtDate(v: Date | string | null): string {
  if (!v) return "Never";
  return new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function relative(v: Date | string | null): string {
  const n = daysSince(v);
  if (!isFinite(n)) return "Never";
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 30) return `${n} days ago`;
  const m = Math.floor(n / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
}

const TABS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Discovered" },
  { id: "published", label: "Published" },
] as const;

export default function SchoolsAdminPage() {
  const [view, setView] = useState<"list" | "discover" | "public">("list");
  const [tab, setTab] = useState<"all" | "pending" | "published">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmSchool, setConfirmSchool] = useState<Row | null>(null);
  const [crawlingId, setCrawlingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.schools.listWithCrawlStatus.useQuery({
    limit: 50,
    offset: 0,
    search: search || undefined,
  });

  const { isCrawling, withCrawlLock } = useCrawlLock();
  const crawlMutation = trpc.crawlQueue.crawlSchool.useMutation();
  const removeMutation = trpc.seeds.removeSchool.useMutation({
    onSuccess: () => {
      toast.success("School deleted");
      setSelectedId(null);
      setConfirmSchool(null);
      refetch();
    },
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  const rows = (data?.schools ?? []) as Row[];
  const withStatus = rows.map((r) => {
    const status = deriveStatus(r.crawlStatus, r.crawlUpdatedAt);
    const stale = status === "published" && daysSince(r.lastScraped) > 30;
    return { row: r, status, stale };
  });
  const counts = {
    // Failed crawls live under the Discovered tab so they stay visible.
    pending: withStatus.filter(
      (s) => s.status === "pending" || s.status === "failed"
    ).length,
    published: withStatus.filter((s) => s.status === "published").length,
    stale: withStatus.filter((s) => s.stale).length,
  };
  const visible = withStatus.filter((s) => {
    if (tab === "all") return true;
    if (tab === "pending") return s.status === "pending" || s.status === "failed";
    return s.status === tab;
  });

  function handleCrawl(schoolId: string, domain: string | null) {
    if (!domain) {
      toast.error("School has no domain to crawl");
      return;
    }
    setCrawlingId(schoolId);
    void withCrawlLock(async () => {
      try {
        const res = await crawlMutation.mutateAsync({ schoolId });
        if (res.status === "completed") {
          toast.success(`Crawled ${res.pages ?? 0} pages — published`);
        } else {
          toast.error(res.error || "Crawl failed");
        }
      } catch (e) {
        // tRPC-level rejections (e.g. another crawl already running server-side)
        toast.error(e instanceof Error ? e.message : "Crawl failed");
      } finally {
        setCrawlingId(null);
        refetch();
      }
    });
  }

  const selected = withStatus.find((s) => s.row.id === selectedId);

  return (
    <div className="mk-root">
      <div className="mk-admin">
        <div className="mk-admin__bar">
          <div className="mk-shell mk-admin__barin">
            <Link href="/" title="Back to site" style={{ flex: "0 0 auto", display: "inline-flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" width={34} height={34} alt="Find a Flight School" />
            </Link>
            <div>
              <div className="mk-admin__eyebrow">Internal · Operations</div>
              <h1 className="mk-admin__title">Schools</h1>
            </div>
            <div className="mk-admin__nav">
              <button
                className={"mk-admin__navbtn" + (view === "list" ? " is-on" : "")}
                onClick={() => setView("list")}
              >
                <Building2 size={16} /> Schools
              </button>
              <button
                className={"mk-admin__navbtn" + (view === "discover" ? " is-on" : "")}
                onClick={() => setView("discover")}
              >
                <Search size={16} /> Discover
              </button>
              <button
                className={"mk-admin__navbtn" + (view === "public" ? " is-on" : "")}
                onClick={() => setView("public")}
              >
                <Globe size={16} /> Public adds
              </button>
            </div>
            <div className="mk-admin__stats">
              <div className="mk-admin__stat">
                <span className="mk-admin__statn">{counts.pending}</span>
                <span className="mk-admin__statl">Discovered</span>
              </div>
              <div className="mk-admin__stat">
                <span className="mk-admin__statn">{counts.published}</span>
                <span className="mk-admin__statl">Published</span>
              </div>
              <div className="mk-admin__stat">
                <span
                  className="mk-admin__statn"
                  style={{ color: counts.stale ? "var(--warning)" : undefined }}
                >
                  {counts.stale}
                </span>
                <span className="mk-admin__statl">Stale</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mk-shell mk-admin__body">
          {view === "discover" && <DiscoverView />}
          {view === "public" && <PublicAdditionsView />}

          {view === "list" && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                }}
              >
                <div className="mk-admin__tabs" style={{ marginBottom: 0 }}>
                  {TABS.map((t) => {
                    const n =
                      t.id === "all"
                        ? withStatus.length
                        : counts[t.id as "pending" | "published"];
                    return (
                      <button
                        key={t.id}
                        className={"mk-admin__tab" + (tab === t.id ? " is-on" : "")}
                        onClick={() => setTab(t.id)}
                      >
                        {t.label} <span className="pt-count">{n}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginLeft: "auto", width: 240 }}>
                  <Input
                    icon={<Search size={16} />}
                    placeholder="Search schools…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Link href="/add-school" className={buttonClass("secondary", "md")}>
                  <Plus size={16} /> Add manually
                </Link>
              </div>

              <div className="mk-tbl">
                <div className="mk-tbl__head">
                  <span className="mk-tbl__h">School</span>
                  <span className="mk-tbl__h">Source</span>
                  <span className="mk-tbl__h">Last crawl</span>
                  <span className="mk-tbl__h">Status</span>
                  <span className="mk-tbl__h mk-tbl__h--right">Actions</span>
                </div>
                {isLoading ? (
                  <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
                    Loading…
                  </div>
                ) : visible.length === 0 ? (
                  <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
                    No schools in this view.
                  </div>
                ) : (
                  visible.map(({ row, status, stale }) => {
                    const addr = (row.addrStd ?? {}) as Record<string, unknown>;
                    const loc = [addr.city, addr.state]
                      .filter((x) => typeof x === "string")
                      .join(", ");
                    const crawling = crawlingId === row.id || status === "crawling";
                    return (
                      <div
                        key={row.id}
                        className={"mk-trow" + (selectedId === row.id ? " is-sel" : "")}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <div>
                          <div className="mk-trow__name">{row.canonicalName}</div>
                          <div className="mk-trow__sub">
                            <MapPin size={13} /> {loc || "—"}
                          </div>
                        </div>
                        <div className="mk-trow__via">
                          <Globe size={16} />
                          {row.googlePlaceId ? "Google" : "Manual"}
                        </div>
                        <div className="mk-trow__crawl">
                          {row.lastScraped ? (
                            <>
                              <span className="is-mono">{fmtDate(row.lastScraped)}</span>
                              <span className={"mk-trow__rel" + (stale ? " is-stale" : "")}>
                                {relative(row.lastScraped)}
                              </span>
                            </>
                          ) : (
                            <span className="mk-trow__rel" style={{ color: "var(--text-faint)" }}>
                              Never
                            </span>
                          )}
                        </div>
                        <div>
                          <StatusChip status={status} stale={stale} error={row.crawlError} />
                        </div>
                        <div className="mk-trow__act" onClick={(e) => e.stopPropagation()}>
                          {crawling ? (
                            <span className="mk-crawling">
                              <RefreshCw size={15} /> Crawling…
                            </span>
                          ) : (
                            <Button
                              variant={status === "published" && !stale ? "secondary" : "primary"}
                              size="sm"
                              disabled={isCrawling}
                              leftIcon={
                                status === "published" || status === "failed" ? (
                                  <RefreshCw size={15} />
                                ) : (
                                  <Globe size={15} />
                                )
                              }
                              onClick={() => handleCrawl(row.id, row.domain)}
                            >
                              {status === "published"
                                ? "Re-crawl"
                                : status === "failed"
                                  ? "Retry crawl"
                                  : "Crawl & publish"}
                            </Button>
                          )}
                          <button
                            className="mk-iconbtn"
                            title="Details"
                            onClick={() => setSelectedId(row.id)}
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {selected && (
          <SchoolDrawer
            school={selected.row}
            status={selected.status}
            stale={selected.stale}
            crawling={crawlingId === selected.row.id || selected.status === "crawling"}
            crawlDisabled={isCrawling}
            onClose={() => setSelectedId(null)}
            onCrawl={() => handleCrawl(selected.row.id, selected.row.domain)}
            onDelete={() => setConfirmSchool(selected.row)}
          />
        )}

        {confirmSchool && (
          <ConfirmDialog
            name={confirmSchool.canonicalName}
            onCancel={() => setConfirmSchool(null)}
            onConfirm={() =>
              removeMutation.mutate({ schoolId: confirmSchool.id })
            }
          />
        )}
      </div>
    </div>
  );
}
