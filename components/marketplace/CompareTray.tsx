"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface CompareTrayProps {
  className?: string;
  variant?: "default" | "floating";
}

export function CompareTray({ className, variant = "default" }: CompareTrayProps) {
  // Check authentication status first
  const { data: roleData, isLoading: isLoadingAuth } =
    trpc.schools.currentUserRole.useQuery();

  const isAuthenticated =
    roleData?.role !== null && roleData?.role !== undefined;

  // Get comparison set
  const { data: comparisonData, isLoading: isLoadingComparison } =
    trpc.marketplace.compare.get.useQuery(undefined, {
      retry: false,
      enabled: isAuthenticated,
    });

  // Don't render if not authenticated or still loading
  if (isLoadingAuth || isLoadingComparison) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  const count = comparisonData?.schoolIds.length ?? 0;

  // Don't render if no schools in comparison
  if (count === 0) {
    return null;
  }

  if (variant === "floating") {
    return (
      <Link href="/compare">
        <Button
          className={cn(
            "fixed bottom-4 right-4 z-50 shadow-lg",
            "flex items-center gap-2",
            className
          )}
          size="lg"
        >
          <Scale className="h-5 w-5" />
          <span>Compare</span>
          <Badge
            variant="secondary"
            className="ml-1 bg-background text-foreground"
          >
            {count}
          </Badge>
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/compare">
      <Button
        variant="outline"
        size="sm"
        className={cn("flex items-center gap-2", className)}
      >
        <Scale className="h-4 w-4" />
        <span>Compare</span>
        {count > 0 && (
          <Badge variant="secondary" className="ml-1">
            {count}
          </Badge>
        )}
      </Button>
    </Link>
  );
}

