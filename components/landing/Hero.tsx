import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plane } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[600px] md:min-h-[700px] lg:min-h-[800px]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero.png"
          alt="Airport runway with small aircraft"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="text-center lg:text-left space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/30 text-white/90 text-sm font-medium mb-4 backdrop-blur-sm">
                <Plane className="h-4 w-4" />
                <span>Student-First Marketplace</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-5xl text-white drop-shadow-lg">
                Find the right flight school—fast.
              </h1>
              <p className="text-lg text-white/90 sm:text-xl max-w-2xl mx-auto lg:mx-0 drop-shadow-md">
                We index flight schools and{" "}
                <strong className="text-white">normalize the details</strong>{" "}
                that matter—cost, timeline, fleet, training type, and more—so
                you can compare with confidence. Trusted{" "}
                <strong className="text-white">verification tiers</strong> help
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
                  className="w-full sm:w-auto bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <Link href="#how-it-works">How it works</Link>
                </Button>
              </div>
              <p className="text-sm text-white/80 pt-2">
                Student-first. School-agnostic.
              </p>
            </div>
            <div className="relative aspect-square max-w-md mx-auto lg:max-w-none">
              {/* Optional: You can remove this placeholder div or keep it for additional content */}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
