import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

export function MatchingAI() {
  return (
    <section
      id="matching-ai"
      className="container mx-auto px-4 py-16 md:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 md:gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span>AI-Powered Matching</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              An AI &quot;training concierge&quot;
            </h2>
            <Card className="border-2 shadow-md rounded-xl">
              <CardContent className="p-6">
                <p className="text-muted-foreground">
                  Tell us your goals, budget, and schedule. We&apos;ll rank
                  schools that fit your constraints and explain the tradeoffs in
                  plain English—e.g.,{" "}
                  <em className="text-foreground font-medium">
                    &ldquo;School A historically completes Instrument 12–18%
                    faster given weekday availability and two G1000 172s.&ldquo;
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
          <div className="relative aspect-square rounded-xl overflow-hidden border shadow-md">
            <Image
              src="/images/network.png"
              alt="Abstract neural network pattern connecting multiple small aircraft icons, AI matching concept, purple and pink gradient background, modern tech illustration"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
