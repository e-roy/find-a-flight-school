"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface SignalsDeleteButtonProps {
  schoolId: string;
}

export function SignalsDeleteButton({ schoolId }: SignalsDeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this signal?")) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/signals_mock?schoolId=${schoolId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Failed to delete signal");
        return;
      }

      router.refresh();
    } catch (error) {
      alert("Failed to delete signal");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}

