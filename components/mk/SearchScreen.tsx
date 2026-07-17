"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Search as SearchIcon, SlidersHorizontal, Banknote, Check, Columns2, ArrowRight } from "lucide-react";
import { Button, buttonClass } from "@/components/core/Button";
import { Input } from "@/components/core/Input";
import { SchoolCard } from "@/components/mk/SchoolCard";
import { useMkState } from "@/components/mk/use-mk-state";
import { trpc } from "@/lib/trpc/client";
import { mkFromSearch } from "@/lib/mk";
import { cn } from "@/lib/utils";

const ALL_PROGRAMS = ["PPL", "IR", "CPL", "CFI", "Multi", "ATP"];
const COST = ["LOW", "MID", "HIGH"] as const;
const COST_LABEL: Record<string, string> = {
  LOW: "Lower ($11k–$15k)",
  MID: "Mid ($16k–$20k)",
  HIGH: "Higher ($21k+)",
};

function Check2({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="mk-check" onClick={onChange}>
      <span className={cn("mk-check__box", checked && "is-on")}>
        {checked && <Check size={13} />}
      </span>
      {label}
    </label>
  );
}

export function SearchScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCity = searchParams.get("city") ?? "";
  const initialFinancing = searchParams.get("financingAvailable") === "true";

  const [city, setCity] = React.useState(initialCity);
  const [programs, setPrograms] = React.useState<string[]>([]);
  const [cost, setCost] = React.useState<string[]>([]);
  const [financing, setFinancing] = React.useState(initialFinancing);
  const [sort, setSort] = React.useState<"rating" | "cost">("rating");

  const { isAuthed, isSaved, toggleSave, isComparing, toggleCompare, clearCompare, compareIds } = useMkState();

  const queryInput = React.useMemo(
    () => ({
      ...(initialCity ? { city: initialCity } : {}),
      ...(initialFinancing ? { financingAvailable: true } : {}),
      radiusKm: 100,
      limit: 50,
      offset: 0,
    }),
    [initialCity, initialFinancing]
  );

  const { data, isLoading } = trpc.marketplace.search.query.useQuery(queryInput);

  function applyServerFilters() {
    const params = new URLSearchParams();
    if (city.trim()) params.set("city", city.trim());
    if (financing) params.set("financingAvailable", "true");
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ""}`);
  }

  function toggle(arr: string[], set: (v: string[]) => void, v: string) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  }

  const COST_ORDER: Record<string, number> = { LOW: 0, MID: 1, HIGH: 2 };

  let results = (data ?? []).map(mkFromSearch).filter((s) => {
    if (programs.length && !programs.every((p) => s.programs.includes(p))) return false;
    if (cost.length && (!s.costBand || !cost.includes(s.costBand))) return false;
    if (financing && !s.financing) return false;
    return true;
  });
  results = [...results].sort((a, b) => {
    if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
    return (COST_ORDER[a.costBand ?? "MID"] ?? 1) - (COST_ORDER[b.costBand ?? "MID"] ?? 1);
  });

  const activeCount = programs.length + cost.length + (financing ? 1 : 0);
  const locLabel = initialCity || "you";

  return (
    <div className="mk-search">
      <div className="mk-search__bar">
        <div className="mk-shell mk-search__barin">
          <div className="mk-search__field">
            <MapPin size={18} style={{ color: "var(--text-faint)" }} />
            <input
              value={city}
              placeholder="City, state, or airport code"
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyServerFilters()}
            />
          </div>
          <div className="mk-search__field mk-search__field--sm">
            <SearchIcon size={16} style={{ color: "var(--text-faint)" }} />
            <input placeholder="Program, aircraft…" disabled />
          </div>
          <Button variant="primary" onClick={applyServerFilters}>
            Search
          </Button>
        </div>
      </div>

      <div className="mk-shell mk-search__body">
        <aside className="mk-filters">
          <div className="mk-filters__head">
            <span className="mk-filters__title">
              <SlidersHorizontal size={16} /> Filters
            </span>
            {activeCount > 0 && (
              <button
                className="mk-filters__clear"
                onClick={() => {
                  setPrograms([]);
                  setCost([]);
                  setFinancing(false);
                }}
              >
                Clear ({activeCount})
              </button>
            )}
          </div>

          <Input
            label="City"
            labelIcon={<MapPin size={15} />}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyServerFilters()}
          />
          <Input
            label="Search radius"
            hint="Miles from your city"
            type="number"
            defaultValue={75}
          />

          <div className="mk-filters__group">
            <span className="mk-filters__label">Programs</span>
            <div className="mk-filters__tags">
              {ALL_PROGRAMS.map((p) => (
                <button
                  key={p}
                  className={cn("mk-ftag", programs.includes(p) && "is-on")}
                  onClick={() => toggle(programs, setPrograms, p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mk-filters__group">
            <span className="mk-filters__label">Expected total cost</span>
            <div className="mk-filters__stack">
              {COST.map((c) => (
                <Check2
                  key={c}
                  checked={cost.includes(c)}
                  label={COST_LABEL[c]}
                  onChange={() => toggle(cost, setCost, c)}
                />
              ))}
            </div>
          </div>

          <div className="mk-filters__group">
            <span className="mk-filters__label">Options</span>
            <Check2
              checked={financing}
              label="Financing available"
              onChange={() => setFinancing(!financing)}
            />
          </div>
        </aside>

        <main className="mk-results">
          <button
            className={cn("mk-finbar", financing && "is-on")}
            onClick={() => setFinancing(!financing)}
          >
            <span className="mk-finbar__main">
              <Banknote size={18} />
              <span>
                Show only schools with <strong>financing</strong>
              </span>
            </span>
            <span className={cn("mk-finbar__toggle", financing && "is-on")}>
              <span className="mk-finbar__knob" />
            </span>
          </button>

          <div className="mk-results__head">
            <h1 className="mk-results__count">
              {isLoading ? "Searching" : results.length}{" "}
              {!isLoading && (results.length === 1 ? "school" : "schools")}
              <span> near {locLabel}</span>
            </h1>
            <div className="mk-sort">
              <span>Sort</span>
              <button
                className={cn(sort === "rating" && "is-on")}
                onClick={() => setSort("rating")}
              >
                Top rated
              </button>
              <button
                className={cn(sort === "cost" && "is-on")}
                onClick={() => setSort("cost")}
              >
                Lowest cost
              </button>
            </div>
          </div>

          <div className="mk-grid mk-grid--3">
            {results.map((s) => (
              <div className="mk-result" key={s.id}>
                <SchoolCard
                  school={s}
                  saved={isAuthed ? isSaved(s.id) : undefined}
                  onToggleSave={isAuthed ? () => toggleSave(s.id) : undefined}
                />
                <button
                  className={cn("mk-cmp", isComparing(s.id) && "is-on")}
                  onClick={() => toggleCompare(s.id)}
                >
                  <Columns2 size={15} />
                  {isComparing(s.id) ? "Comparing" : "Compare"}
                </button>
              </div>
            ))}
          </div>

          {!isLoading && results.length === 0 && (
            <p className="mk-block__note" style={{ marginTop: 8 }}>
              No schools match your filters. Try widening your search.
            </p>
          )}
        </main>
      </div>

      {compareIds.length > 0 && (
        <div className="mk-tray">
          <div className="mk-shell mk-tray__in">
            <span className="mk-tray__label">
              <Columns2 size={16} /> {compareIds.length} selected to compare
            </span>
            <div className="mk-tray__actions">
              <Button variant="ghost" size="sm" onClick={clearCompare}>
                Clear
              </Button>
              <Link href="/compare" className={buttonClass("primary", "sm")}>
                Compare schools
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
