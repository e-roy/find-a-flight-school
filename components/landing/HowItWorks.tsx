import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, BarChart3, ShieldCheck } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: Search,
      title: "Search & Filter",
      description:
        "Filter by program (PPL, IR, CPL), budget, financing, Part 61/141, fleet/sim, and more.",
      image: "/images/magnify.png",
      imageAlt:
        "Magnifying glass over a map with multiple flight school locations marked, aviation search concept",
    },
    {
      icon: BarChart3,
      title: "Compare What Matters",
      description:
        "Side-by-side cards show normalized data, including Expected Total Cost bands and typical timelines.",
      image: "/images/compare.png",
      imageAlt:
        "Two small aircraft side by side for comparison, one modern and one traditional, aviation comparison concept",
    },
    {
      icon: ShieldCheck,
      title: "Decide with Confidence",
      description:
        "Badges and evidence panels clarify what's verified and when it was last updated.",
      image: "/images/decide.png",
      imageAlt:
        "Shield with checkmark and aviation wings, trust and verification symbol, professional badge design",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="container mx-auto px-4 py-16 md:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to find your perfect flight school match
          </p>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-3 items-stretch">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 shadow-md rounded-xl"
              >
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 space-y-4 p-6">
                  <p className="text-sm text-muted-foreground flex-1">
                    {step.description}
                  </p>
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted shadow-sm">
                    <Image
                      src={step.image}
                      alt={step.imageAlt}
                      fill
                      className="object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex justify-center pt-4">
          <Button asChild size="lg">
            <Link href="/search">Start your search</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
