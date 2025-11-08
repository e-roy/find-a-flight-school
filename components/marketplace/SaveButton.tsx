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

  // Get saved schools list to check if this school is saved
  const {
    data: savedIds,
    isLoading: isLoadingSaved,
    error: savedError,
  } = trpc.marketplace.saved.list.useQuery(undefined, {
    retry: false,
  });

  const isSaved = savedIds?.includes(schoolId) ?? false;
  const displaySaved = isOptimistic ? !isSaved : isSaved;

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

  // Don't render if we can't determine saved state (not authenticated)
  if (isLoadingSaved === false && (savedIds === undefined || savedError)) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={toggleMutation.isPending || isLoadingSaved}
      className={cn(className)}
      aria-label={displaySaved ? "Remove from saved" : "Save school"}
    >
      <Heart className={cn("h-4 w-4", displaySaved && "fill-current")} />
      {size !== "icon" && (
        <span className="ml-2">{displaySaved ? "Saved" : "Save"}</span>
      )}
    </Button>
  );
}
