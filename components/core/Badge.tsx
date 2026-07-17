import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "amber"
  | "sky"
  | "success"
  | "warning"
  | "danger";
export type BadgeVariant = "soft" | "solid" | "outline";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  icon = null,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "ffs-badge",
        `ffs-badge--${variant}`,
        `t-${tone}`,
        size === "sm" && "ffs-badge--sm",
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
