"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { CompareTableView } from "@/components/mk/CompareTableView";
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

export default function ComparePage() {
  const router = useRouter();

  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    error: comparisonError,
  } = trpc.marketplace.compare.get.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (isUnauthorized(comparisonError)) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent("/compare")}`);
    }
  }, [comparisonError, router]);

  const schoolIds = comparisonData?.schoolIds ?? [];
  const maxSchools = 4;
  const paddedSchoolIds = [
    ...schoolIds,
    ...Array(maxSchools - schoolIds.length).fill(null),
  ].slice(0, maxSchools);

  const schoolQueries = paddedSchoolIds.map((schoolId) =>
    trpc.schools.byIdWithFacts.useQuery(
      { id: schoolId ?? "" },
      { enabled: schoolId !== null }
    )
  );

  const isLoadingSchools = schoolQueries.some((q) => q.isLoading);

  const mkSchools = schoolQueries
    .map((q) => q.data)
    .filter(
      (d): d is NonNullable<typeof d> =>
        d !== null && d !== undefined && d.school !== null
    )
    .map((d) => {
      const organized = organizeFactsByCategory(d.facts);
      const financing = extractFinancingInfo(d.latestSnapshot);
      return mkFromFacts({
        school: d.school,
        facts: organized,
        signals: d.signals,
        claimed: d.claimed,
        financing: financing ? { available: true } : undefined,
      });
    });

  if (isLoadingComparison || isLoadingSchools) {
    return (
      <div className="mk-shell mk-compare">
        <p className="mk-block__note">Loading comparison…</p>
      </div>
    );
  }

  return <CompareTableView schools={mkSchools} />;
}
