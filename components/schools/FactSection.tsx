"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface FactSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FactSection({
  title,
  icon,
  children,
  className,
}: FactSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface FactItemProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function FactItem({ label, value, className }: FactItemProps) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}
