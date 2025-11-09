import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search } from "lucide-react";

export function CTABand() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background py-16 md:py-24">
      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Search className="h-4 w-4" />
            <span>Get Started</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to explore schools near you?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Compare real options with normalized data, clear badges, and smarter
            matches.
          </p>
          <div className="pt-4">
            <Button asChild size="lg" className="group text-lg px-8 py-6">
              <Link href="/search">
                Start your search
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

