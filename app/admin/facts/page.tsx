"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FactModerationRow } from "@/components/admin/FactModerationRow";
import { useState } from "react";

export default function FactsPage() {
  const [schoolIdFilter, setSchoolIdFilter] = useState("");
  const [factKeyFilter, setFactKeyFilter] = useState("");

  const { data: pendingFacts, isLoading } = trpc.facts.listPending.useQuery({
    limit: 100,
  });

  // Get school names for facts
  const schoolIds = pendingFacts
    ? Array.from(new Set(pendingFacts.map((f) => f.schoolId)))
    : [];
  const schoolQueries = schoolIds.map((id) =>
    trpc.schools.byId.useQuery({ id }, { enabled: schoolIds.length > 0 })
  );
  const schoolMap = new Map<string, string>();
  schoolQueries.forEach((query, index) => {
    if (query.data) {
      schoolMap.set(schoolIds[index]!, query.data.canonicalName);
    }
  });

  const filteredFacts = pendingFacts?.filter((fact) => {
    if (schoolIdFilter && !fact.schoolId.includes(schoolIdFilter)) {
      return false;
    }
    if (factKeyFilter && !fact.factKey.includes(factKeyFilter)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Facts Moderation</h2>
        <p className="text-muted-foreground">
          Review and approve/reject pending claim facts
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
              <label className="text-sm font-medium mb-2 block">Fact Key</label>
              <Input
                type="text"
                value={factKeyFilter}
                onChange={(e) => setFactKeyFilter(e.target.value)}
                placeholder="Filter by fact key..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Facts</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : `${filteredFacts?.length ?? 0} pending facts`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Fact Key</TableHead>
                  <TableHead>Fact Value</TableHead>
                  <TableHead>Provenance</TableHead>
                  <TableHead>As Of</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : !filteredFacts || filteredFacts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No pending facts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacts.map((fact) => (
                    <FactModerationRow
                      key={`${fact.schoolId}-${fact.factKey}-${fact.asOf.toISOString()}`}
                      fact={fact}
                      schoolName={schoolMap.get(fact.schoolId)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

