import { db } from "@/lib/db";
import { seedCandidates } from "@/db/schema/seeds";
import { desc } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function SeedsPage() {
  const seeds = await db
    .select()
    .from(seedCandidates)
    .orderBy(desc(seedCandidates.createdAt))
    .limit(100);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Seed Candidates</h1>
          <p className="text-muted-foreground">
            Latest 100 seed candidates loaded into the database
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/seed-upload">Upload Seeds</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seed List</CardTitle>
          <CardDescription>Total: {seeds.length} rows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seeds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No seed candidates found. Upload a CSV file to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  seeds.map((seed) => (
                    <TableRow key={seed.id}>
                      <TableCell className="font-medium">{seed.name}</TableCell>
                      <TableCell>{seed.city || "-"}</TableCell>
                      <TableCell>{seed.state || "-"}</TableCell>
                      <TableCell>{seed.country || "-"}</TableCell>
                      <TableCell>{seed.phone || "-"}</TableCell>
                      <TableCell>
                        {seed.website ? (
                          <a
                            href={seed.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {seed.website}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {seed.confidence !== null ? seed.confidence.toFixed(1) : "-"}
                      </TableCell>
                      <TableCell>
                        {seed.createdAt
                          ? new Date(seed.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
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

