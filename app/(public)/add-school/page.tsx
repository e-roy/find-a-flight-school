"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Plane, Search, Star, MapPin, ArrowRight, Check } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button, buttonClass } from "@/components/core/Button";
import { Stepper } from "@/components/mk/portal-bits";
import { GoogleG } from "@/components/mk/icons";
import { Preview, Submitted, type PlaceData } from "@/components/mk/AddSchoolSteps";
import {
  TurnstileWidget,
  type TurnstileHandle,
} from "@/components/TurnstileWidget";
import {
  PublicResultsMap,
  type MapCandidate,
} from "@/components/PublicResultsMap";

interface Candidate extends MapCandidate {
  website?: string;
  phone?: string;
  rating?: number;
  ratingCount?: number;
}

const STEPS = ["Find the school", "Confirm details", "Submitted"];

export default function AddSchoolPage() {
  const [step, setStep] = useState(0);
  const [q, setQ] = useState("");
  const [token, setToken] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [place, setPlace] = useState<PlaceData | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [addedIsNew, setAddedIsNew] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const turnstile = useRef<TurnstileHandle>(null);
  const discover = trpc.seeds.publicDiscover.useMutation();
  const submit = trpc.seeds.publicSubmit.useMutation();

  const onVerify = useCallback((t: string) => setToken(t), []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults(null);
    setSelectedId(null);
    if (!token) {
      setError("Please complete the verification challenge first.");
      return;
    }
    try {
      const res = await discover.mutateAsync({ q, turnstileToken: token });
      const list = res as Candidate[];
      setResults(list);
      if (list.length > 0) setSelectedId(list[0].placeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      turnstile.current?.reset();
    }
  }

  async function handleSubmit() {
    if (!place) return;
    if (!token) {
      setError("Please complete the verification challenge again.");
      return;
    }
    setError(null);
    try {
      const res = await submit.mutateAsync({
        placeId: place.placeId,
        turnstileToken: token,
      });
      setAddedId(res.schoolId);
      setAddedIsNew(res.isNew);
      setStep(2);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the school.");
    } finally {
      turnstile.current?.reset();
    }
  }

  const selected = results?.find((c) => c.placeId === selectedId) ?? null;

  // Is the selected Google result already in our directory? (same dedup rule)
  const existsQuery = trpc.seeds.publicExists.useQuery(
    { placeId: selected?.placeId, website: selected?.website },
    { enabled: !!selected }
  );
  const existing =
    existsQuery.data?.exists && existsQuery.data.schoolId
      ? existsQuery.data
      : null;

  function reset() {
    setStep(0);
    setQ("");
    setResults(null);
    setSelectedId(null);
    setPlace(null);
    setAddedId(null);
    setError(null);
  }

  return (
    <div className="pt-page">
      <div className="pt-wrap pt-wrap--wide">
        <div className="pt-head">
          <span className="pt-eyebrow">
            <Plane size={13} /> Add a flight school
          </span>
          <h1 className="pt-title">Put a school on the map</h1>
          <p className="pt-lead">
            Know a flight school that isn&apos;t listed? Add it in under a minute
            — no account needed.
          </p>
        </div>

        <Stepper steps={STEPS} current={step} />

        {error && (
          <p
            className="pt-callout pt-callout--amber"
            style={{ marginBottom: 16, display: "block" }}
          >
            {error}
          </p>
        )}

        {step === 0 && (
          <div>
            <form className="pt-finder__bar" onSubmit={handleSearch}>
              <div className="pt-ta__field">
                <Search size={20} />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by school name, city, or airport code…"
                />
              </div>
              <Button
                variant="primary"
                type="submit"
                disabled={discover.isPending || !token}
                leftIcon={<Search size={16} />}
              >
                {discover.isPending ? "Searching…" : "Search"}
              </Button>
            </form>

            <div style={{ marginTop: 14 }}>
              <TurnstileWidget ref={turnstile} onVerify={onVerify} />
            </div>

            {results && results.length === 0 && (
              <div className="pt-finder" style={{ display: "block" }}>
                <div className="pt-finder__empty">
                  No match on Google for “{q}”. Try a different name or location.
                </div>
              </div>
            )}

            {results && results.length > 0 && (
              <>
                <p className="pt-finder__count" style={{ marginTop: 18 }}>
                  <b>{results.length}</b> result
                  {results.length === 1 ? "" : "s"} from <GoogleG size={12} />{" "}
                  Google Places
                </p>
                <div className="pt-finder">
                  <div className="pt-finder__list">
                    {results.map((r) => (
                      <button
                        key={r.placeId}
                        className={
                          "pt-resultcard" +
                          (selectedId === r.placeId ? " is-sel" : "")
                        }
                        onClick={() => setSelectedId(r.placeId)}
                      >
                        <span className="pt-resultcard__pin">
                          <MapPin size={17} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="pt-resultcard__name">{r.name}</span>
                          <span className="pt-resultcard__addr">
                            {r.address}
                          </span>
                          {r.rating != null && (
                            <span className="pt-resultcard__rate">
                              <Star size={12} fill="currentColor" /> {r.rating}{" "}
                              ({r.ratingCount ?? 0})
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-mapwrap">
                    <div className="pt-map2">
                      <PublicResultsMap
                        candidates={results}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                      />
                    </div>
                    {selected && (
                      <div className="pt-detail">
                        <h3 className="pt-detail__name pt-clamp1">
                          {selected.name}
                        </h3>
                        <p className="pt-detail__addr pt-clamp2">
                          {selected.address}
                        </p>
                        <div className="pt-detail__row">
                          <span className="pt-detail__k">Phone</span>
                          <span className="pt-detail__v is-mono">
                            {selected.phone || "—"}
                          </span>
                        </div>
                        <div className="pt-detail__row">
                          <span className="pt-detail__k">Rating</span>
                          <span className="pt-detail__v">
                            {selected.rating != null ? (
                              <span className="pt-detail__rate">
                                <Star size={14} fill="currentColor" />{" "}
                                {selected.rating}{" "}
                                <span style={{ color: "var(--text-muted)" }}>
                                  ({selected.ratingCount ?? 0})
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                        <div className="pt-detail__row">
                          <span className="pt-detail__k">Website</span>
                          <span className="pt-detail__v" style={{ minWidth: 0 }}>
                            {selected.website ? (
                              <a
                                className="pt-clamp1"
                                href={
                                  selected.website.startsWith("http")
                                    ? selected.website
                                    : `https://${selected.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {selected.website
                                  .replace(/^https?:\/\//i, "")
                                  .replace(/^www\./i, "")
                                  .split(/[/?#]/)[0]}
                              </a>
                            ) : (
                              "—"
                            )}
                          </span>
                        </div>
                        <div className="pt-detail__row">
                          <span className="pt-detail__k">Status</span>
                          {existing ? (
                            <span
                              className="pt-detail__v"
                              style={{
                                color: "var(--tier-verified)",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <Check size={15} /> Already in the directory
                            </span>
                          ) : (
                            <span
                              className="pt-detail__v"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {existsQuery.isLoading
                                ? "Checking…"
                                : "Not yet listed"}
                            </span>
                          )}
                        </div>
                        <div
                          className="pt-detail__row"
                          style={{ borderTop: "none", marginTop: 8, paddingTop: 0 }}
                        >
                          <span />
                          {existing ? (
                            <Link
                              href={`/schools/${existing.schoolId}`}
                              className={buttonClass("primary", "md", true)}
                            >
                              Visit school <ArrowRight size={16} />
                            </Link>
                          ) : (
                            <Button
                              variant="primary"
                              fullWidth
                              disabled={existsQuery.isLoading}
                              onClick={() => {
                                setPlace(selected);
                                setStep(1);
                                window.scrollTo(0, 0);
                              }}
                              rightIcon={<ArrowRight size={16} />}
                            >
                              Add this school
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 1 && place && (
          <>
            <Preview
              place={place}
              onBack={() => setStep(0)}
              onSubmit={handleSubmit}
              submitting={submit.isPending}
            />
            <div style={{ marginTop: 16 }}>
              <TurnstileWidget ref={turnstile} onVerify={onVerify} />
            </div>
          </>
        )}

        {step === 2 && place && (
          <Submitted
            name={place.name}
            schoolId={addedId}
            isNew={addedIsNew}
            domain={
              place.website
                ? place.website.replace(/^https?:\/\//, "").replace(/^www\./, "")
                : undefined
            }
            onAddAnother={reset}
          />
        )}
      </div>
    </div>
  );
}
