"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminOverviewPage() {
  const { data: schoolsData, isLoading: isLoadingSchools } =
    trpc.schools.listWithCrawlStatus.useQuery({ limit: 1 });

  const { data: pendingFacts, isLoading: isLoadingFacts } =
    trpc.admin.facts.listPending.useQuery({ limit: 100 });

  const { data: queueData, isLoading: isLoadingQueue } =
    trpc.admin.queue.list.useQuery({ limit: 100 });

  const schoolsCount = schoolsData?.total ?? 0;
  const pendingFactsCount = pendingFacts?.length ?? 0;
  const pendingQueueCount = queueData?.totalPending ?? 0;
  const failedQueueCount = queueData?.totalFailed ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Overview</h2>
        <p className="text-muted-foreground">
          Monitor system health and data operations
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Schools</CardTitle>
            <CardDescription>Total schools in system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingSchools ? "..." : schoolsCount.toLocaleString()}
            </div>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link href="/admin/schools">View Schools →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Facts</CardTitle>
            <CardDescription>Facts awaiting moderation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingFacts ? "..." : pendingFactsCount.toLocaleString()}
            </div>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link href="/admin/facts">Moderate Facts →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue Length</CardTitle>
            <CardDescription>Pending crawl items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingQueue ? "..." : pendingQueueCount.toLocaleString()}
            </div>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link href="/admin/queue">View Queue →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Items</CardTitle>
            <CardDescription>Failed crawl attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {isLoadingQueue ? "..." : failedQueueCount.toLocaleString()}
            </div>
            <Button variant="link" className="p-0 h-auto mt-2" asChild>
              <Link href="/admin/queue">View Failures →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin operations</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/schools">Manage Schools</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/facts">Moderate Facts</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/queue">Monitor Queue</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Operations</CardTitle>
            <CardDescription>View and manage data</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/snapshots">View Snapshots</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/signals">Manage Signals</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/match-tester">Match Tester</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

