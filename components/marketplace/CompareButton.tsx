"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CompareButtonProps {
  schoolId: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function CompareButton({
  schoolId,
  className,
  variant = "outline",
  size = "sm",
}: CompareButtonProps) {
  const utils = trpc.useUtils();
  const [isOptimistic, setIsOptimistic] = useState(false);

  // Check authentication status first to prevent flash
  // All hooks must be called unconditionally at the top
  const { data: roleData, isLoading: isLoadingAuth } =
    trpc.schools.currentUserRole.useQuery();

  // Get comparison set to check if this school is in it
  // Only enable this query when user is authenticated
  const isAuthenticated =
    roleData?.role !== null && roleData?.role !== undefined;
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    error: comparisonError,
  } = trpc.marketplace.compare.get.useQuery(undefined, {
    retry: false,
    enabled: isAuthenticated, // Only run query if authenticated
  });

  const setMutation = trpc.marketplace.compare.set.useMutation({
    onMutate: async () => {
      // Optimistic update
      setIsOptimistic(true);
    },
    onSuccess: (data) => {
      setIsOptimistic(false);
      // Invalidate comparison query to refetch
      utils.marketplace.compare.get.invalidate();
      
      // data is null when comparison was cleared (empty array)
      if (data === null) {
        toast.success("Removed from comparison");
      } else {
        const isInComparison = data.schoolIds.includes(schoolId);
        if (isInComparison) {
          toast.success("Added to comparison");
        } else {
          toast.success("Removed from comparison");
        }
      }
    },
    onError: (error) => {
      // Revert optimistic update on error
      setIsOptimistic(false);
      toast.error(error.message || "Failed to update comparison");
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!comparisonData) {
      // No existing comparison, create new one with this school
      setMutation.mutate({ schoolIds: [schoolId] });
      return;
    }

    const currentIds = comparisonData.schoolIds;
    const isInComparison = currentIds.includes(schoolId);

    if (isInComparison) {
      // Remove from comparison
      const newIds = currentIds.filter((id) => id !== schoolId);
      setMutation.mutate({ schoolIds: newIds });
    } else {
      // Add to comparison (check max limit)
      if (currentIds.length >= 4) {
        toast.error("Maximum 4 schools can be compared");
        return;
      }
      const newIds = [...currentIds, schoolId];
      setMutation.mutate({ schoolIds: newIds });
    }
  };

  // Don't render if not authenticated (role is null)
  // Wait for auth check to complete before deciding
  if (isLoadingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Don't render if we can't determine comparison state (shouldn't happen if authenticated, but safety check)
  if (
    isLoadingComparison === false &&
    (comparisonData === undefined || comparisonError)
  ) {
    return null;
  }

  const isInComparison =
    comparisonData?.schoolIds.includes(schoolId) ?? false;
  const displayInComparison = isOptimistic ? !isInComparison : isInComparison;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={setMutation.isPending || isLoadingComparison}
      className={cn(
        displayInComparison 
          ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
          : className
      )}
      aria-label={
        displayInComparison ? "Remove from comparison" : "Add to comparison"
      }
    >
      <Scale
        className={cn(
          "h-4 w-4",
          displayInComparison && "fill-current"
        )}
      />
      {size !== "icon" && (
        <span className="ml-2">
          {displayInComparison ? "In Compare" : "Compare"}
        </span>
      )}
    </Button>
  );
}

