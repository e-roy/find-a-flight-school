"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { Play } from "lucide-react";

interface ProcessQueueButtonProps {
  limit?: number;
  onSuccess?: () => void;
}

export function ProcessQueueButton({
  limit = 20,
  onSuccess,
}: ProcessQueueButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const utils = trpc.useUtils();

  const process = trpc.admin.queue.process.useMutation({
    onSuccess: (result) => {
      if (result.processed === 0) {
        toast.info("No pending items to process");
      } else {
        const message = `Processed ${result.processed} items: ${result.queued} queued, ${result.completed} completed, ${result.failed} failed`;
        toast.success(message);

        // Show error details if there are errors
        if (result.errors.length > 0) {
          // Show each error in a separate toast for better readability
          result.errors.forEach((error, index) => {
            const truncatedError =
              error.error.length > 100
                ? `${error.error.substring(0, 100)}...`
                : error.error;
            toast.error(
              `Error ${index + 1}/${result.errors.length} (${error.id.slice(
                0,
                8
              )}): ${truncatedError}`,
              { duration: 8000 }
            );
          });
        }
      }
      utils.crawlQueue.listPending.invalidate();
      utils.crawlQueue.listProcessing.invalidate();
      utils.crawlQueue.listFailed.invalidate();
      onSuccess?.();
      setIsProcessing(false);
    },
    onError: (error) => {
      toast.error(`Failed to process queue: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const handleClick = () => {
    setIsProcessing(true);
    process.mutate({ limit });
  };

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleClick}
      disabled={isProcessing}
    >
      <Play className={`h-4 w-4 mr-2 ${isProcessing ? "animate-pulse" : ""}`} />
      {isProcessing ? "Processing..." : `Process Queue (${limit})`}
    </Button>
  );
}
