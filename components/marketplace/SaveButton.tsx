"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  schoolId: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function SaveButton({
  schoolId,
  className,
  variant = "outline",
  size = "sm",
}: SaveButtonProps) {
  const utils = trpc.useUtils();
  const [isOptimistic, setIsOptimistic] = useState(false);

  // Check authentication status first to prevent flash
  // All hooks must be called unconditionally at the top
  const { data: roleData, isLoading: isLoadingAuth } =
    trpc.schools.currentUserRole.useQuery();

  // Get saved schools list to check if this school is saved
  // Only enable this query when user is authenticated
  const isAuthenticated =
    roleData?.role !== null && roleData?.role !== undefined;
  const {
    data: savedIds,
    isLoading: isLoadingSaved,
    error: savedError,
  } = trpc.marketplace.saved.list.useQuery(undefined, {
    retry: false,
    enabled: isAuthenticated, // Only run query if authenticated
  });

  const toggleMutation = trpc.marketplace.saved.toggle.useMutation({
    onMutate: async () => {
      // Optimistic update
      setIsOptimistic(true);
    },
    onSuccess: () => {
      setIsOptimistic(false);
      // Invalidate saved list query to refetch
      utils.marketplace.saved.list.invalidate();
    },
    onError: () => {
      // Revert optimistic update on error
      setIsOptimistic(false);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMutation.mutate({ schoolId });
  };

  // Don't render if not authenticated (role is null)
  // Wait for auth check to complete before deciding
  if (isLoadingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Don't render if we can't determine saved state (shouldn't happen if authenticated, but safety check)
  if (isLoadingSaved === false && (savedIds === undefined || savedError)) {
    return null;
  }

  const isSaved = savedIds?.includes(schoolId) ?? false;
  const displaySaved = isOptimistic ? !isSaved : isSaved;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={toggleMutation.isPending || isLoadingSaved}
      className={cn(className)}
      aria-label={displaySaved ? "Remove from saved" : "Save school"}
    >
      <Heart
        className={cn("h-4 w-4 text-red-500", displaySaved && "fill-red-500")}
      />
      {size !== "icon" && (
        <span className="ml-2">{displaySaved ? "Saved" : "Save"}</span>
      )}
    </Button>
  );
}
