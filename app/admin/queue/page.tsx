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
import { Badge } from "@/components/ui/badge";
import { QueueRetryButton } from "@/components/admin/QueueRetryButton";
import { ProcessQueueButton } from "@/components/admin/ProcessQueueButton";

export default function QueuePage() {
  const { data: pending, isLoading: isLoadingPending } =
    trpc.crawlQueue.listPending.useQuery(
      { limit: 50 },
      { refetchInterval: 10000 } // Auto-refresh every 10 seconds
    );

  const { data: failed, isLoading: isLoadingFailed } =
    trpc.crawlQueue.listFailed.useQuery({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Crawl Queue</h2>
          <p className="text-muted-foreground">
            Monitor and manage crawl queue items
          </p>
        </div>
        <ProcessQueueButton limit={20} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Items</CardTitle>
          <CardDescription>
            {isLoadingPending
              ? "Loading..."
              : `${pending?.length ?? 0} pending items`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School ID</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Scheduled At</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPending ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : !pending || pending.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No pending items
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.schoolId}
                      </TableCell>
                      <TableCell>{item.domain}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>
                      <TableCell>{item.attempts}</TableCell>
                      <TableCell>
                        {item.scheduledAt
                          ? new Date(item.scheduledAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
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

      <Card>
        <CardHeader>
          <CardTitle>Failed Items</CardTitle>
          <CardDescription>
            {isLoadingFailed
              ? "Loading..."
              : `${failed?.length ?? 0} failed items`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School ID</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingFailed ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : !failed || failed.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      No failed items
                    </TableCell>
                  </TableRow>
                ) : (
                  failed.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.schoolId}
                      </TableCell>
                      <TableCell>{item.domain}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{item.status}</Badge>
                      </TableCell>
                      <TableCell>{item.attempts}</TableCell>
                      <TableCell>
                        {item.updatedAt
                          ? new Date(item.updatedAt).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <QueueRetryButton queueId={item.id} />
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
