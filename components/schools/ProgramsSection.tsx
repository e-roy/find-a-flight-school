"use client";

import { FactSection } from "./FactSection";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";

interface ProgramsSectionProps {
  programs: string[];
}

export function ProgramsSection({ programs }: ProgramsSectionProps) {
  if (programs.length === 0) {
    return null;
  }

  return (
    <FactSection
      title="Programs Offered"
      icon={<GraduationCap className="h-5 w-5" />}
    >
      <div className="flex flex-wrap gap-2">
        {programs.map((program) => (
          <Badge key={program} variant="secondary" className="text-sm">
            {program}
          </Badge>
        ))}
      </div>
    </FactSection>
  );
}
