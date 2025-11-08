"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface QueueRetryButtonProps {
  queueId: string;
  onSuccess?: () => void;
}

export function QueueRetryButton({ queueId, onSuccess }: QueueRetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const utils = trpc.useUtils();

  const retry = trpc.crawlQueue.retry.useMutation({
    onSuccess: () => {
      toast.success("Queue item retried successfully");
      utils.crawlQueue.listPending.invalidate();
      utils.crawlQueue.listFailed.invalidate();
      onSuccess?.();
      setIsRetrying(false);
    },
    onError: (error) => {
      toast.error(`Failed to retry: ${error.message}`);
      setIsRetrying(false);
    },
  });

  const handleClick = () => {
    setIsRetrying(true);
    retry.mutate({ queueId });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isRetrying}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? "animate-spin" : ""}`} />
      {isRetrying ? "Retrying..." : "Retry"}
    </Button>
  );
}

