"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { SchoolCard } from "@/components/mk/SchoolCard";
import { useMkState } from "@/components/mk/use-mk-state";
import { buttonClass } from "@/components/core/Button";
import { organizeFactsByCategory } from "@/lib/utils-facts";
import { extractFinancingInfo } from "@/lib/utils-financing";
import { mkFromFacts } from "@/lib/mk";

function isUnauthorized(
  error: { data?: { code?: string } | null; message?: string } | null
) {
  return (
    !!error &&
    (error.data?.code === "UNAUTHORIZED" ||
      !!error.message?.toLowerCase().includes("unauthorized"))
  );
}

export default function SavedPage() {
  const router = useRouter();
  const { isAuthed, isSaved, toggleSave } = useMkState();

  const {
    data: savedIds,
    isLoading: isLoadingSaved,
    error: savedError,
  } = trpc.marketplace.saved.list.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (isUnauthorized(savedError)) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent("/saved")}`);
    }
  }, [savedError, router]);

  const { data: schoolsData, isLoading: isLoadingSchools } =
    trpc.schools.byIdsWithFacts.useQuery(
      { ids: savedIds ?? [] },
      { enabled: savedIds !== undefined && savedIds.length > 0 }
    );

  const mkSchools = (schoolsData ?? [])
    .filter((d) => d.school !== null && d.school !== undefined)
    .map((d) =>
      mkFromFacts({
        school: d.school,
        facts: organizeFactsByCategory(d.facts),
        signals: d.signals,
        financing: extractFinancingInfo(d.latestSnapshot)
          ? { available: true }
          : undefined,
      })
    );

  const loading =
    isLoadingSaved || (savedIds && savedIds.length > 0 && isLoadingSchools);

  return (
    <div className="mk-shell mk-plain">
      <h1 className="mk-plain__title">Saved schools</h1>
      <p className="mk-plain__lead">
        {mkSchools.length} school{mkSchools.length === 1 ? "" : "s"} saved for
        later.
      </p>

      {loading ? (
        <p className="mk-block__note">Loading…</p>
      ) : mkSchools.length > 0 ? (
        <div className="mk-grid">
          {mkSchools.map((s) => (
            <SchoolCard
              key={s.id}
              school={s}
              saved={isAuthed ? isSaved(s.id) : undefined}
              onToggleSave={isAuthed ? () => toggleSave(s.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <Link href="/search" className={buttonClass("primary", "md")}>
          Find schools to save
        </Link>
      )}
    </div>
  );
}
