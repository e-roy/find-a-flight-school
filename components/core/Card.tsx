import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "md" | "none";
}

/** Standard surface: white, hairline border, soft shadow, 14px radius. */
export function Card({
  interactive = false,
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "ffs-card",
        padding === "none" ? "ffs-card--flush" : "ffs-card--pad",
        interactive && "ffs-card--interactive",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
