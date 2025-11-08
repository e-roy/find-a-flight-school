"use client";

import { trpc } from "@/lib/trpc/client";
import { SnapshotViewer } from "@/components/admin/SnapshotViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function SnapshotsPage() {
  const [schoolIdFilter, setSchoolIdFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const { data: snapshots, isLoading } = trpc.snapshots.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Get school names for snapshots (fetch individually for now)
  const schoolIds = snapshots
    ? Array.from(new Set(snapshots.map((s) => s.schoolId)))
    : [];
  
  // Create a map of school IDs to names by fetching each school
  // For performance, we'll just show the ID and let users click through
  const schoolMap = new Map<string, string>();

  const filteredSnapshots = snapshots?.filter((snapshot) => {
    if (schoolIdFilter && !snapshot.schoolId.includes(schoolIdFilter)) {
      return false;
    }
    if (domainFilter && snapshot.domain && !snapshot.domain.includes(domainFilter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Snapshots</h2>
        <p className="text-muted-foreground">
          View raw JSON snapshots from crawled school websites
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                School ID
              </label>
              <Input
                type="text"
                value={schoolIdFilter}
                onChange={(e) => setSchoolIdFilter(e.target.value)}
                placeholder="Filter by school ID..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Domain</label>
              <Input
                type="text"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                placeholder="Filter by domain..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              Loading snapshots...
            </div>
          </CardContent>
        </Card>
      ) : !filteredSnapshots || filteredSnapshots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Snapshots Found</CardTitle>
            <CardDescription>
              No snapshots match your filters or no snapshots exist yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSnapshots.map((snapshot) => (
            <SnapshotViewer
              key={snapshot.id}
              snapshot={snapshot}
              schoolName={schoolMap.get(snapshot.schoolId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

