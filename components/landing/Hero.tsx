import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Plane className="h-4 w-4" />
                <span>Student-First Marketplace</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-5xl">
                Find the right flight school—fast.
              </h1>
              <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto lg:mx-0">
                We index flight schools and{" "}
                <strong>normalize the details</strong> that matter—cost,
                timeline, fleet, training type, and more—so you can compare with
                confidence. Trusted <strong>verification tiers</strong> help
                separate signal from noise.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/search">Start your search</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Link href="#how-it-works">How it works</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                Student-first. School-agnostic.
              </p>
            </div>
            <div className="relative aspect-square max-w-md mx-auto lg:max-w-none">
              {/* AI Image Prompt: "Modern small aircraft (Cessna 172 style) flying over beautiful landscape with clear blue sky, professional aviation photography, bright and inspiring, 3D render style, high quality" */}
              <div className="relative w-full h-full rounded-2xl overflow-hidden border shadow-2xl bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950/20 dark:to-sky-950/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-2 p-8">
                    <Plane className="h-24 w-24 mx-auto text-primary/20" />
                    <p className="text-xs text-muted-foreground max-w-xs">
                      AI Image: Modern small aircraft flying over beautiful
                      landscape with clear blue sky
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
