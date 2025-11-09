import Image from "next/image";

const trustTiers = [
  {
    image: "/images/trophy.png",
    label: "Premier Flight School",
    description: "exceeds operational benchmarks",
    emoji: "🥇",
  },
  {
    image: "/images/verified.png",
    label: "Verified FSP School",
    description: "facts cross-checked with FSP signals",
    emoji: "✅",
  },
  {
    image: "/images/handshake.png",
    label: "Community-Verified",
    description: "claimed + attested",
    emoji: "🤝",
  },
  {
    image: "/images/unverified.png",
    label: "Unverified",
    description: "discovered via crawl",
    emoji: "",
  },
];

export function TrustStrip() {
  return (
    <section className="border-y bg-gradient-to-b from-muted/40 to-muted/20 py-10 md:py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-5xl">
            {trustTiers.map((tier, index) => (
              <div
                key={index}
                className="group flex flex-col items-center gap-4 p-6 rounded-xl bg-background border-2 border-border/50 hover:border-primary/30 hover:shadow-lg hover:bg-background transition-all duration-300"
              >
                <div className="relative w-24 h-24 md:w-28 md:h-28 shrink-0">
                  <Image
                    src={tier.image}
                    alt={tier.label}
                    fill
                    sizes="(max-width: 768px) 96px, 112px"
                    className="object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                    loading={index === 0 ? "eager" : "lazy"}
                    priority={index === 0}
                  />
                </div>
                <div className="text-center space-y-2 flex-1">
                  <div className="flex flex-col items-center gap-1">
                    {tier.emoji && (
                      <span className="text-2xl mb-1">{tier.emoji}</span>
                    )}
                    <h3 className="text-sm md:text-base font-bold leading-tight text-foreground">
                      {tier.label}
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {tier.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-2xl">
            Badges reflect how each profile's facts are verified.
          </p>
        </div>
      </div>
    </section>
  );
}
