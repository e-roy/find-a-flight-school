"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export default function LeadsPage() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.portal.leads.list.useQuery({
    limit,
    offset: page * limit,
  });

  const leads = data?.leads || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLeadEmail = (payload: unknown): string => {
    if (payload && typeof payload === "object" && "email" in payload) {
      return String(payload.email);
    }
    return "N/A";
  };

  const getLeadMessage = (payload: unknown): string => {
    if (payload && typeof payload === "object" && "message" in payload) {
      const message = String(payload.message);
      return message.length > 100 ? `${message.substring(0, 100)}...` : message;
    }
    return "No message";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Inbound Leads</h2>
        <p className="text-muted-foreground">
          View and manage leads from students interested in your school
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            {total} total lead{total !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No leads yet.</p>
              <p className="text-sm mt-2">
                Leads from students will appear here when they contact you.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getLeadEmail(lead.payloadJson)}
                        </TableCell>
                        <TableCell className="max-w-md">
                          {getLeadMessage(lead.payloadJson)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
