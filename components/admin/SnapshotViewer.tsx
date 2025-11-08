"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface SnapshotViewerProps {
  snapshot: {
    id: string;
    schoolId: string;
    domain: string | null;
    asOf: Date;
    rawJson: unknown;
    extractConfidence: number | null;
  };
  schoolName?: string;
}

export function SnapshotViewer({ snapshot, schoolName }: SnapshotViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 text-left">
                <CardTitle className="text-base">
                  {schoolName || snapshot.schoolId}
                </CardTitle>
                <div className="text-sm text-muted-foreground mt-1 space-x-4">
                  <span>Domain: {snapshot.domain || "-"}</span>
                  <span>
                    As of: {new Date(snapshot.asOf).toLocaleString()}
                  </span>
                  {snapshot.extractConfidence !== null && (
                    <span>
                      Confidence: {(snapshot.extractConfidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <ScrollArea className="h-96 w-full rounded-md border p-4">
              <pre className="text-xs font-mono">
                {JSON.stringify(snapshot.rawJson, null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

