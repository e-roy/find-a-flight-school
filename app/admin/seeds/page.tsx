"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SeedsListView } from "@/components/admin/SeedsListView";
import { AddByUrlView } from "@/components/admin/AddByUrlView";
import { DiscoverView } from "@/components/admin/DiscoverView";

type View = "list" | "add-by-url" | "discover";

export default function SeedsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<View>("list");

  // Sync view with URL query param
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "add-by-url" || viewParam === "discover") {
      setView(viewParam);
    } else {
      setView("list");
    }
  }, [searchParams]);

  const handleViewChange = (newView: string) => {
    const validView = newView as View;
    setView(validView);
    // Update URL without navigation
    const params = new URLSearchParams(searchParams.toString());
    if (validView === "list") {
      params.delete("view");
    } else {
      params.set("view", validView);
    }
    const newUrl = params.toString()
      ? `/admin/seeds?${params.toString()}`
      : "/admin/seeds";
    router.replace(newUrl, { scroll: false });
  };

  const handleAddByUrlSuccess = () => {
    handleViewChange("list");
  };

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={handleViewChange}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Seed Candidates</h2>
            <p className="text-muted-foreground">
              Manage and resolve seed candidates
            </p>
          </div>
          <div>
            <TabsList>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="add-by-url">Add by URL</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
            </TabsList>
          </div>
          {view === "list" ? (
            <Button variant="outline" asChild>
              <Link href="/admin/seed-upload">Upload Seeds</Link>
            </Button>
          ) : (
            <div />
          )}
        </div>

        <TabsContent value="list" className="mt-6">
          <SeedsListView />
        </TabsContent>
        <TabsContent value="add-by-url" className="mt-6">
          <AddByUrlView onSuccess={handleAddByUrlSuccess} />
        </TabsContent>
        <TabsContent value="discover" className="mt-6">
          <DiscoverView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
