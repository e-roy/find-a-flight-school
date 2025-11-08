import { db } from "@/lib/db";
import { signalsMock } from "@/db/schema/signals_mock";
import { schools } from "@/db/schema/schools";
import { eq } from "drizzle-orm";
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
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/schools/TierBadge";
import Link from "next/link";
import { SignalsEditDialog } from "@/components/admin/SignalsEditDialog";
import { SignalsDeleteButton } from "@/components/admin/SignalsDeleteButton";

export default async function SignalsPage() {
  // Fetch all signals with school names
  const allSignals = await db.select().from(signalsMock);

  // Fetch school names for each signal
  const signalsWithSchools = await Promise.all(
    allSignals.map(async (signal) => {
      const school = await db
        .select()
        .from(schools)
        .where(eq(schools.id, signal.schoolId))
        .limit(1);

      return {
        ...signal,
        schoolName: school[0]?.canonicalName || "Unknown School",
      };
    })
  );

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Mock Signals</h1>
          <p className="text-muted-foreground">
            Manage training velocity, schedule reliability, and safety notes for
            schools
          </p>
        </div>
        <SignalsEditDialog mode="create" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signals List</CardTitle>
          <CardDescription>Total: {signalsWithSchools.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School Name</TableHead>
                  <TableHead>Training Velocity</TableHead>
                  <TableHead>Schedule Reliability</TableHead>
                  <TableHead>Safety Notes</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signalsWithSchools.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No signals found. Create a new signal entry to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  signalsWithSchools.map((signal) => (
                    <TableRow key={signal.schoolId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/schools/${signal.schoolId}`}
                          className="text-primary hover:underline"
                        >
                          {signal.schoolName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {signal.trainingVelocity !== null
                          ? `${(signal.trainingVelocity * 100).toFixed(0)}%`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {signal.scheduleReliability !== null
                          ? `${(signal.scheduleReliability * 100).toFixed(0)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {signal.safetyNotes || "-"}
                      </TableCell>
                      <TableCell>
                        <TierBadge
                          velocity={signal.trainingVelocity}
                          reliability={signal.scheduleReliability}
                          safetyNotes={signal.safetyNotes}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <SignalsEditDialog mode="edit" signal={signal} />
                          <SignalsDeleteButton schoolId={signal.schoolId} />
                        </div>
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

