import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, CheckCircle2, Handshake, AlertCircle } from "lucide-react";

const tiers = [
  {
    icon: Trophy,
    emoji: "🥇",
    title: "Premier Flight School",
    description:
      "Meets or exceeds composite benchmarks across training velocity, schedule reliability, utilization balance, and satisfaction.",
    color: "text-yellow-600 dark:text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    image: "/images/trophy.png",
  },
  {
    icon: CheckCircle2,
    emoji: "✅",
    title: "Verified FSP School",
    description:
      "Profile facts are cross-checked against FSP aggregated operational signals (e.g., hours-to-rating, instructor coverage, downtime consistency).",
    color: "text-green-600 dark:text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-800",
    image: "/images/verified.png",
  },
  {
    icon: Handshake,
    emoji: "🤝",
    title: "Community-Verified",
    description:
      "Claimed profile with documentation and periodic attestations.",
    color: "text-blue-600 dark:text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    image: "/images/handshake.png",
  },
  {
    icon: AlertCircle,
    emoji: "",
    title: "Unverified",
    description: "Discovered via crawl; not yet verified.",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    image: "/images/unverified.png",
  },
];

export function TrustTiers() {
  return (
    <section id="trust-tiers" className="bg-muted/30 py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Transparent trust tiers
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every profile displays a clear verification tier so you know
              what&apos;s been checked—and how.
            </p>
          </div>
          <div className="grid gap-6 md:gap-8 md:grid-cols-2 items-stretch">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <Card
                  key={index}
                  className={`group flex flex-col h-full hover:shadow-lg transition-all duration-300 border-2 ${tier.borderColor} ${tier.bgColor} shadow-md rounded-xl`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${tier.bgColor} ${tier.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="flex items-center gap-2">
                        {tier.emoji && <span>{tier.emoji}</span>}
                        {tier.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 space-y-4 p-6">
                    <p className="text-sm text-muted-foreground flex-1">
                      {tier.description}
                    </p>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-background shadow-sm">
                      <Image
                        src={tier.image}
                        alt={tier.title}
                        fill
                        className="object-contain p-4"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="p-6 rounded-xl bg-background border text-center shadow-md">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Each fact shows an &ldquo;as-of&ldquo;
              timestamp; outliers are flagged for review.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
