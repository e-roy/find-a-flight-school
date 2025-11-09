import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Problem() {
  return (
    <section className="bg-muted/30 py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">The Problem</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                The problem today
              </h2>
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-destructive mt-1 font-bold">×</span>
                  <span>
                    Information is <strong>fragmented, inconsistent, and often outdated</strong>{" "}
                    across sites.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive mt-1 font-bold">×</span>
                  <span>
                    Schools struggle to stand out on <strong>reliability and outcomes</strong>, not
                    just price.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive mt-1 font-bold">×</span>
                  <span>
                    Students can't easily compare <strong>true total cost</strong> or realistic
                    timelines.
                  </span>
                </li>
              </ul>
              <div className="pt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-lg font-medium">
                    We fix this with complete coverage and standardized, comparable data.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border shadow-lg">
              {/* AI Image Prompt: "Split screen showing problem vs solution - left side: chaotic scattered papers and documents with flight school information, right side: organized stack of standardized documents with checkmarks, professional illustration" */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 flex items-center justify-center">
                <div className="text-center space-y-2 p-8">
                  <AlertCircle className="h-16 w-16 mx-auto text-destructive/20" />
                  <p className="text-xs text-muted-foreground max-w-xs">
                    AI Image: Split screen showing chaotic documents vs organized standardized information
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

