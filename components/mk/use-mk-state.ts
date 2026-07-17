"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

/**
 * Shared saved/compare state for the marketplace UI. Fetches the saved list
 * and comparison set once and exposes toggles wired to the real mutations.
 */
export function useMkState() {
  const utils = trpc.useUtils();

  const { data: roleData } = trpc.schools.currentUserRole.useQuery();
  const isAuthed = roleData?.role != null;

  const { data: savedIds } = trpc.marketplace.saved.list.useQuery(undefined, {
    retry: false,
    enabled: isAuthed,
  });

  const { data: comparison } = trpc.marketplace.compare.get.useQuery(undefined, {
    retry: false,
    enabled: isAuthed,
  });

  const saveMutation = trpc.marketplace.saved.toggle.useMutation({
    onSuccess: () => utils.marketplace.saved.list.invalidate(),
  });

  const compareMutation = trpc.marketplace.compare.set.useMutation({
    onSuccess: () => utils.marketplace.compare.get.invalidate(),
    onError: (e) => toast.error(e.message || "Failed to update comparison"),
  });

  const compareIds = comparison?.schoolIds ?? [];

  function toggleSave(schoolId: string) {
    if (!isAuthed) {
      toast.error("Sign in to save schools");
      return;
    }
    saveMutation.mutate({ schoolId });
  }

  function toggleCompare(schoolId: string) {
    if (!isAuthed) {
      toast.error("Sign in to compare schools");
      return;
    }
    const current = compareIds;
    if (current.includes(schoolId)) {
      compareMutation.mutate({ schoolIds: current.filter((id) => id !== schoolId) });
    } else {
      if (current.length >= 4) {
        toast.error("Maximum 4 schools can be compared");
        return;
      }
      compareMutation.mutate({ schoolIds: [...current, schoolId] });
    }
  }

  function clearCompare() {
    compareMutation.mutate({ schoolIds: [] });
  }

  return {
    isAuthed,
    savedIds: savedIds ?? [],
    isSaved: (id: string) => (savedIds ?? []).includes(id),
    toggleSave,
    compareIds,
    isComparing: (id: string) => compareIds.includes(id),
    toggleCompare,
    clearCompare,
  };
}
