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
      imagePrompt: "Magnifying glass over a map with multiple flight school locations marked, aviation search concept, professional illustration",
    },
    {
      icon: BarChart3,
      title: "Compare What Matters",
      description:
        "Side-by-side cards show normalized data, including Expected Total Cost bands and typical timelines.",
      imagePrompt: "Two small aircraft side by side for comparison, one modern and one traditional, aviation comparison concept, professional illustration",
    },
    {
      icon: ShieldCheck,
      title: "Decide with Confidence",
      description:
        "Badges and evidence panels clarify what's verified and when it was last updated.",
      imagePrompt: "Shield with checkmark and aviation wings, trust and verification symbol, professional badge design",
    },
  ];

  return (
    <section id="how-it-works" className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to find your perfect flight school match
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
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
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                    {/* AI Image Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                      <div className="text-center space-y-2 p-4">
                        <Icon className="h-12 w-12 mx-auto text-primary/20" />
                        <p className="text-xs text-muted-foreground max-w-[200px]">
                          AI: {step.imagePrompt}
                        </p>
                      </div>
                    </div>
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

