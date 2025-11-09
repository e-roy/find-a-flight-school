import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

export function MatchingAI() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Matching</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              An AI "training concierge"
            </h2>
            <Card className="border-2">
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Tell us your goals, budget, and schedule. We'll rank schools that
                  fit your constraints and explain the tradeoffs in plain English—e.g.,{" "}
                  <em className="text-foreground font-medium">
                    "School A historically completes Instrument 12–18% faster given
                    weekday availability and two G1000 172s."
                  </em>
                </p>
              </CardContent>
            </Card>
            <Button asChild size="lg" className="group">
              <Link href="/search?tab=match">
                Take the questionnaire
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            {/* AI Image Prompt: "Abstract neural network pattern connecting multiple small aircraft icons, AI matching concept, purple and pink gradient background, modern tech illustration" */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2 p-8">
                <Sparkles className="h-24 w-24 mx-auto text-primary/20" />
                <p className="text-xs text-muted-foreground max-w-xs">
                  AI Image: Neural network pattern connecting aircraft icons, AI matching concept
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

