"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ExistenceStatus {
  existsInSeeds: boolean;
  existsInSchools: boolean;
  matches: Array<{
    type: "seed" | "school";
    id: string;
    name: string;
    domain?: string;
  }>;
}

interface AddByUrlViewProps {
  onSuccess?: () => void;
}

export function AddByUrlView({ onSuccess }: AddByUrlViewProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [existenceStatus, setExistenceStatus] =
    useState<ExistenceStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const utils = trpc.useUtils();

  const createMutation = trpc.seeds.createFromUrl.useMutation({
    onSuccess: () => {
      toast.success("Seed created successfully");
      // Invalidate queries to refresh list
      utils.seeds.list.invalidate();
      utils.seeds.search.invalidate();
      // Reset form
      setUrl("");
      setName("");
      setCity("");
      setState("");
      setCountry("");
      setExistenceStatus(null);
      // Switch to list view
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error(`Failed to create seed: ${error.message}`);
    },
  });

  const handleCheckExists = async () => {
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }

    setIsChecking(true);
    try {
      // Extract domain from URL for checking
      let domain: string | undefined;
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace(/^www\./i, "").toLowerCase();
      } catch {
        // If URL parsing fails, try to extract domain
        const match = url.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
        domain = match?.[1]?.toLowerCase();
      }

      if (!domain) {
        toast.error("Invalid URL format");
        setIsChecking(false);
        return;
      }

      const result = await utils.seeds.exists.fetch({
        domain,
        name: name || undefined,
      });

      setExistenceStatus(result);
    } catch (error) {
      console.error("Failed to check existence:", error);
      toast.error("Failed to check existence");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }

    // Check if exists in schools (block creation)
    if (existenceStatus?.existsInSchools) {
      toast.error("Cannot create seed: already exists in schools");
      return;
    }

    createMutation.mutate({
      url,
      name: name || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
    });
  };

  const canCreate = existenceStatus && !existenceStatus.existsInSchools;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seed Information</CardTitle>
        <CardDescription>
          Enter a URL and optional details to create a seed candidate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setExistenceStatus(null);
              }}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Flight School Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City (optional)</Label>
              <Input
                id="city"
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State (optional)</Label>
              <Input
                id="state"
                type="text"
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country (optional)</Label>
              <Input
                id="country"
                type="text"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCheckExists}
              disabled={isChecking || !url.trim()}
            >
              {isChecking ? "Checking..." : "Check Exists"}
            </Button>
            <Button
              type="submit"
              disabled={!canCreate || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Seed"}
            </Button>
          </div>
        </form>

        {existenceStatus && (
          <div className="mt-6 space-y-2">
            <div className="text-sm font-medium">Existence Status:</div>
            <div className="flex gap-2 flex-wrap">
              {existenceStatus.existsInSchools ? (
                <Badge variant="destructive">Exists in Schools</Badge>
              ) : existenceStatus.existsInSeeds ? (
                <Badge variant="secondary">Exists in Seeds</Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                >
                  New
                </Badge>
              )}
            </div>

            {existenceStatus.matches.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">Matches:</div>
                <div className="space-y-1">
                  {existenceStatus.matches.map((match, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground p-2 bg-muted rounded"
                    >
                      <span className="font-medium">
                        {match.type === "seed" ? "Seed" : "School"}:
                      </span>{" "}
                      {match.name}
                      {match.domain && ` (${match.domain})`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

