"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/core/Button";
import { SchoolCard } from "@/components/mk/SchoolCard";
import { useMkState } from "@/components/mk/use-mk-state";
import { trpc } from "@/lib/trpc/client";
import { mkFromSearch } from "@/lib/mk";

export function Featured() {
  const { data } = trpc.marketplace.search.query.useQuery({
    limit: 12,
    offset: 0,
    radiusKm: 100,
  });
  const { isAuthed, isSaved, toggleSave } = useMkState();

  const schools = (data ?? [])
    .filter((s) => (s.facts?.rating ?? 0) > 0)
    .sort((a, b) => (b.facts?.rating ?? 0) - (a.facts?.rating ?? 0))
    .slice(0, 3)
    .map(mkFromSearch);

  if (schools.length === 0) return null;

  return (
    <section className="mk-section">
      <div className="mk-shell">
        <div className="mk-section__head mk-section__head--row">
          <div>
            <span className="mk-eyebrow">Featured</span>
            <h2 className="mk-h2">Top-rated schools this week</h2>
          </div>
          <Link href="/search" className={buttonClass("secondary", "md")}>
            Browse all
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mk-grid">
          {schools.map((s) => (
            <SchoolCard
              key={s.id}
              school={s}
              saved={isAuthed ? isSaved(s.id) : undefined}
              onToggleSave={isAuthed ? () => toggleSave(s.id) : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
