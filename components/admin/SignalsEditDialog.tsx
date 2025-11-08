"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { signalsMock } from "@/db/schema/signals_mock";
import { useRouter } from "next/navigation";

interface SignalsEditDialogProps {
  mode: "create" | "edit";
  signal?: typeof signalsMock.$inferSelect & { schoolName?: string };
}

export function SignalsEditDialog({ mode, signal }: SignalsEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    schoolId: signal?.schoolId || "",
    trainingVelocity:
      signal?.trainingVelocity !== null && signal?.trainingVelocity !== undefined
        ? String(signal.trainingVelocity)
        : "",
    scheduleReliability:
      signal?.scheduleReliability !== null &&
      signal?.scheduleReliability !== undefined
        ? String(signal.scheduleReliability)
        : "",
    safetyNotes: signal?.safetyNotes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        schoolId: formData.schoolId,
        trainingVelocity:
          formData.trainingVelocity === ""
            ? null
            : parseFloat(formData.trainingVelocity),
        scheduleReliability:
          formData.scheduleReliability === ""
            ? null
            : parseFloat(formData.scheduleReliability),
        safetyNotes: formData.safetyNotes || null,
      };

      const method = mode === "create" ? "POST" : "PATCH";
      const response = await fetch("/api/admin/signals_mock", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || "Failed to save signals");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch (error) {
      alert("Failed to save signals");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={mode === "create" ? "default" : "outline"} size="sm">
          {mode === "create" ? "Create Signal" : "Edit"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Create Signal" : "Edit Signal"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Add mock signals for a school"
                : `Edit signals for ${signal?.schoolName || "this school"}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="schoolId">School ID</Label>
              <Input
                id="schoolId"
                value={formData.schoolId}
                onChange={(e) =>
                  setFormData({ ...formData, schoolId: e.target.value })
                }
                placeholder="Enter school UUID"
                required
                disabled={mode === "edit"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="trainingVelocity">
                Training Velocity (0.0 - 1.0)
              </Label>
              <Input
                id="trainingVelocity"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.trainingVelocity}
                onChange={(e) =>
                  setFormData({ ...formData, trainingVelocity: e.target.value })
                }
                placeholder="0.0 - 1.0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scheduleReliability">
                Schedule Reliability (0.0 - 1.0)
              </Label>
              <Input
                id="scheduleReliability"
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.scheduleReliability}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduleReliability: e.target.value,
                  })
                }
                placeholder="0.0 - 1.0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="safetyNotes">Safety Notes</Label>
              <Textarea
                id="safetyNotes"
                value={formData.safetyNotes}
                onChange={(e) =>
                  setFormData({ ...formData, safetyNotes: e.target.value })
                }
                placeholder="Optional safety notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

