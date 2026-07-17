"use client";

import * as React from "react";
import { Globe, ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/core/Button";
import { Input } from "@/components/core/Input";
import { Tag } from "@/components/core/Tag";
import { SrcChip } from "@/components/mk/portal-bits";
import { trpc } from "@/lib/trpc/client";
import { FACT_KEYS } from "@/types";
import type { OrganizedFacts } from "@/lib/utils-facts";

interface FieldDef {
  key: string;
  label: string;
  factKey: string;
  mono?: boolean;
}

const EDITABLE: FieldDef[] = [
  { key: "email", label: "Contact email", factKey: FACT_KEYS.CONTACT_EMAIL, mono: true },
  { key: "phone", label: "Contact phone", factKey: FACT_KEYS.CONTACT_PHONE, mono: true },
  { key: "costNotes", label: "Pricing notes", factKey: FACT_KEYS.COST_NOTES },
];

export function ClaimReview({
  schoolId,
  facts,
  onPublished,
}: {
  schoolId: string;
  facts: OrganizedFacts;
  onPublished: () => void;
}) {
  const initial = React.useMemo(
    () => ({
      email: facts.email ?? "",
      phone: facts.phone ?? "",
      costNotes: facts.costNotes ?? "",
    }),
    [facts]
  );
  const [values, setValues] = React.useState<Record<string, string>>(initial);
  const [editing, setEditing] = React.useState<string | null>(null);
  const publish = trpc.claim.publish.useMutation();

  const factCount =
    facts.programs.length +
    (facts.fleetAircraft?.length ?? 0) +
    [facts.costBand, facts.airportCode, facts.email, facts.phone, facts.rating].filter(
      (v) => v != null && v !== ""
    ).length;

  function handlePublish() {
    const out: { factKey: string; factValue: unknown }[] = [];
    for (const f of EDITABLE) {
      const v = values[f.key].trim();
      const orig = (initial[f.key as keyof typeof initial] ?? "").trim();
      if (v && v !== orig) out.push({ factKey: f.factKey, factValue: v });
    }
    publish.mutate(
      { schoolId, facts: out },
      { onSuccess: () => onPublished() }
    );
  }

  return (
    <>
      <div className="pt-callout" style={{ marginBottom: 18 }}>
        <span className="pt-callout__icon">
          <Check size={20} />
        </span>
        <div>
          <p className="pt-callout__title">
            Crawl found {factCount} fact{factCount === 1 ? "" : "s"}
          </p>
          <p className="pt-callout__text">
            Every field is tagged with where it came from. Edit anything
            that&apos;s off — your edits override the crawl and publish
            immediately.
          </p>
        </div>
      </div>

      <div className="pt-card">
        <h3 className="mk-card__title" style={{ marginBottom: 6 }}>
          <Globe size={18} /> From your website
        </h3>

        {facts.programs.length > 0 && (
          <Row label="Programs" source="crawl">
            <div className="pt-tags">
              {facts.programs.map((p) => (
                <span className="pt-tag" key={p}>
                  {p}
                </span>
              ))}
            </div>
          </Row>
        )}
        {facts.fleetAircraft && facts.fleetAircraft.length > 0 && (
          <Row label="Fleet" source="crawl">
            <div className="pt-tags">
              {facts.fleetAircraft.map((a) => (
                <span className="pt-tag" key={a}>
                  {a}
                </span>
              ))}
            </div>
          </Row>
        )}
        {facts.costBand && (
          <Row label="Expected cost" source="crawl">
            <span className="pt-field__val is-mono">{facts.costBand}</span>
          </Row>
        )}

        {EDITABLE.map((f) => {
          const orig = (initial[f.key as keyof typeof initial] ?? "").trim();
          const edited = values[f.key].trim() !== orig && values[f.key].trim() !== "";
          return (
            <div className="pt-field" key={f.key}>
              <span className="pt-field__label">
                <span className="pt-field__name">{f.label}</span>
              </span>
              <div className="pt-field__main">
                <div className="pt-field__row">
                  {editing === f.key ? (
                    <input
                      className="pt-field__input"
                      autoFocus
                      value={values[f.key]}
                      onChange={(e) =>
                        setValues({ ...values, [f.key]: e.target.value })
                      }
                      onBlur={() => setEditing(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                    />
                  ) : (
                    <span className={"pt-field__val" + (f.mono ? " is-mono" : "")}>
                      {values[f.key] || (
                        <span style={{ color: "var(--text-faint)" }}>—</span>
                      )}
                    </span>
                  )}
                  {editing !== f.key && (
                    <button
                      className="pt-field__edit"
                      onClick={() => setEditing(f.key)}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="pt-field__meta">
                  <SrcChip source={edited ? "manual" : "crawl"} />
                  <span className="pt-field__page">
                    {edited ? "Edited by you" : "From crawl"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-actions" style={{ justifyContent: "flex-end" }}>
        <Button
          variant="primary"
          onClick={handlePublish}
          disabled={publish.isPending}
          rightIcon={
            publish.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )
          }
        >
          {publish.isPending ? "Publishing…" : "Confirm & publish profile"}
        </Button>
      </div>
    </>
  );
}

function Row({
  label,
  source,
  children,
}: {
  label: string;
  source: "crawl" | "google";
  children: React.ReactNode;
}) {
  return (
    <div className="pt-field">
      <span className="pt-field__label">
        <span className="pt-field__name">{label}</span>
      </span>
      <div className="pt-field__main">
        <div className="pt-field__row">{children}</div>
        <div className="pt-field__meta">
          <SrcChip source={source} />
        </div>
      </div>
    </div>
  );
}
