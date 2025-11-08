"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const { data, isLoading, error } = trpc.portal.analytics.get.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Analytics</h2>
          <p className="text-muted-foreground">
            Error loading analytics: {error.message}
          </p>
        </div>
      </div>
    );
  }

  const metrics = data || {
    views: 0,
    ctr: 0,
    matchAppearances: 0,
    financingClicks: 0,
    leads: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Analytics</h2>
        <p className="text-muted-foreground">
          Track your school's performance metrics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Views */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Views</CardTitle>
            <CardDescription>Total number of profile page views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.views}</div>
          </CardContent>
        </Card>

        {/* Click-Through Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Click-Through Rate</CardTitle>
            <CardDescription>
              Percentage of views that resulted in leads or financing clicks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.ctr}%</div>
            <p className="text-sm text-muted-foreground mt-2">
              {metrics.leads + metrics.financingClicks} clicks from{" "}
              {metrics.views} views
            </p>
          </CardContent>
        </Card>

        {/* Match Appearances */}
        <Card>
          <CardHeader>
            <CardTitle>Match Appearances</CardTitle>
            <CardDescription>
              Times your school appeared in match results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.matchAppearances}</div>
          </CardContent>
        </Card>

        {/* Financing Clicks */}
        <Card>
          <CardHeader>
            <CardTitle>Financing Clicks</CardTitle>
            <CardDescription>
              Number of financing intent clicks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.financingClicks}</div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Total Leads</CardTitle>
            <CardDescription>Inbound leads from contact forms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{metrics.leads}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

