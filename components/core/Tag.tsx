import * as React from "react";
import { cn } from "@/lib/utils";

export type TagTone = "default" | "accent" | "sky";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  icon?: React.ReactNode;
}

/** Monospace chip for aviation data tokens (program codes, aircraft, Part 61/141). */
export function Tag({
  tone = "default",
  icon = null,
  className,
  children,
  ...rest
}: TagProps) {
  return (
    <span
      className={cn("ffs-tag", tone !== "default" && `ffs-tag--${tone}`, className)}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
