import * as React from "react";
import { Check, Globe, SlidersHorizontal } from "lucide-react";
import { GoogleG } from "@/components/mk/icons";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="pt-steps">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="pt-steps__line" />}
          <div
            className={cn(
              "pt-steps__item",
              i === current && "is-active",
              i < current && "is-done"
            )}
          >
            <span className="pt-steps__dot">
              {i < current ? <Check size={13} /> : i + 1}
            </span>
            <span className="pt-steps__lbl">{s}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export type Source = "google" | "crawl" | "estimate" | "manual";

export function SrcChip({ source }: { source: Source }) {
  const map: Record<Source, [string, React.ReactNode, string]> = {
    google: ["pt-src--google", <GoogleG size={11} key="g" />, "Google"],
    crawl: ["pt-src--crawl", <Globe size={11} key="c" />, "Crawl"],
    estimate: ["pt-src--estimate", <SlidersHorizontal size={11} key="e" />, "Estimate"],
    manual: ["pt-src--manual", <Check size={11} key="m" />, "You"],
  };
  const [cls, ic, label] = map[source];
  return (
    <span className={cn("pt-src", cls)}>
      {ic}
      {label}
    </span>
  );
}
