"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface SeedResolverButtonProps {
  seedId: string;
  onSuccess?: () => void;
}

export function SeedResolverButton({ seedId, onSuccess }: SeedResolverButtonProps) {
  const [isResolving, setIsResolving] = useState(false);
  const utils = trpc.useUtils();

  const rerunResolver = trpc.seeds.rerunResolver.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.domain
          ? `Resolved domain: ${data.domain} (confidence: ${(data.confidence * 100).toFixed(0)}%)`
          : "Resolver completed but no domain found"
      );
      utils.seeds.list.invalidate();
      utils.seeds.search.invalidate();
      onSuccess?.();
      setIsResolving(false);
    },
    onError: (error) => {
      toast.error(`Failed to resolve: ${error.message}`);
      setIsResolving(false);
    },
  });

  const handleClick = () => {
    setIsResolving(true);
    rerunResolver.mutate({ seedId });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isResolving}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isResolving ? "animate-spin" : ""}`} />
      {isResolving ? "Resolving..." : "Re-run Resolver"}
    </Button>
  );
}

