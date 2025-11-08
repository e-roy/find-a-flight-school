"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { FACT_KEYS } from "@/types";

export default function PortalPage() {
  const { data: profileData, isLoading: isLoadingProfile } = trpc.portal.profile.get.useQuery();
  const { data: leadsData, isLoading: isLoadingLeads } = trpc.portal.leads.list.useQuery({
    limit: 1,
    offset: 0,
  });

  // Calculate completeness
  const expectedFactKeys = [
    FACT_KEYS.CONTACT_EMAIL,
    FACT_KEYS.CONTACT_PHONE,
    FACT_KEYS.PROGRAM_TYPE,
    FACT_KEYS.FLEET_AIRCRAFT,
    FACT_KEYS.COST_BAND,
  ];
  
  const presentFactKeys = new Set(
    profileData?.facts.map((f) => f.factKey) || []
  );
  
  const completenessCount = expectedFactKeys.filter((key) => {
    // For PROGRAM_TYPE, check if at least one exists
    if (key === FACT_KEYS.PROGRAM_TYPE) {
      return Array.from(presentFactKeys).some((k) => k === FACT_KEYS.PROGRAM_TYPE);
    }
    return presentFactKeys.has(key);
  }).length;

  const completenessPercentage = Math.round(
    (completenessCount / expectedFactKeys.length) * 100
  );

  const leadsCount = leadsData?.total ?? 0;

  if (isLoadingProfile || isLoadingLeads) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Overview</h2>
        <p className="text-muted-foreground">
          Manage your school profile, view leads, and track your progress
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Leads Count Card */}
        <Card>
          <CardHeader>
            <CardTitle>Inbound Leads</CardTitle>
            <CardDescription>Total leads received from students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">{leadsCount}</div>
            <Button asChild variant="outline">
              <Link href="/portal/leads">View All Leads</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Profile Completeness Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Completeness</CardTitle>
            <CardDescription>How complete is your school profile?</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-4xl font-bold">{completenessPercentage}%</div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${completenessPercentage}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {completenessCount} of {expectedFactKeys.length} required fields completed
              </p>
              <Button asChild variant="outline">
                <Link href="/portal/profile">Edit Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="outline">
              <Link href="/portal/profile">Edit Profile</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/leads">View Leads</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/analytics">Analytics</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

