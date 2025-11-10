import { Badge } from "@/components/ui/badge";

export function TrustStrip() {
  return (
    <section className="border-y bg-muted/30 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Badge variant="outline" className="text-sm">
              🥇 Premier Flight School — exceeds operational benchmarks
            </Badge>
            <Badge variant="outline" className="text-sm">
              ✅ Verified FSP School — facts cross-checked with FSP signals
            </Badge>
            <Badge variant="outline" className="text-sm">
              🤝 Community-Verified — claimed + attested
            </Badge>
            <Badge variant="outline" className="text-sm">
              Unverified — discovered via crawl
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-2xl">
            Badges reflect how each profile&apos;s facts are verified.
          </p>
        </div>
      </div>
    </section>
  );
}
