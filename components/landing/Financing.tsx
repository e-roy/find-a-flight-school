import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Award, Calculator } from "lucide-react";

const financingOptions = [
  {
    icon: CreditCard,
    title: "Lender Pre-Qual",
    description: "(soft pull)",
    imagePrompt: "Credit card and document stack with approval stamp, financial services concept, professional illustration",
  },
  {
    icon: Award,
    title: "VA / Scholarships",
    description: "Flags right on profiles",
    imagePrompt: "Military service medal and scholarship award badges, veteran benefits and education funding symbols",
  },
  {
    icon: Calculator,
    title: "Affordability Calculator",
    description: "To estimate what you'll actually pay per month with pace/fuel sensitivity sliders",
    imagePrompt: "Calculator with aviation-themed elements like aircraft and dollar signs, financial planning concept, professional illustration",
  },
];

export function Financing() {
  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Financing & funding—made clearer
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transparent tools to help you understand the real cost
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {financingOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card
                  key={index}
                  className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50"
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{option.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                      {/* AI Image Placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center space-y-2 p-4">
                          <Icon className="h-12 w-12 mx-auto text-primary/20" />
                          <p className="text-xs text-muted-foreground max-w-[200px]">
                            AI: {option.imagePrompt}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto">
            All designed to help you plan realistically, not optimistically.
          </p>
        </div>
      </div>
    </section>
  );
}

