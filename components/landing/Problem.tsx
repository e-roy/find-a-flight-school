import Image from "next/image";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function Problem() {
  return (
    <section id="problem" className="bg-muted/30 py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  The Problem
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                The problem today
              </h2>
              <ul className="space-y-4 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-destructive mt-1 font-bold">×</span>
                  <span>
                    Information is{" "}
                    <strong>
                      fragmented, inconsistent, and often outdated
                    </strong>{" "}
                    across sites.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive mt-1 font-bold">×</span>
                  <span>
                    Schools struggle to stand out on{" "}
                    <strong>reliability and outcomes</strong>, not just price.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-destructive mt-1 font-bold">×</span>
                  <span>
                    Students can&apos;t easily compare{" "}
                    <strong>true total cost</strong> or realistic timelines.
                  </span>
                </li>
              </ul>
              <div className="pt-4 p-6 rounded-xl bg-primary/5 border border-primary/20 shadow-md">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-lg font-medium">
                    We fix this with complete coverage and standardized,
                    comparable data.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden border shadow-md">
              <Image
                src="/images/problem.png"
                alt="Split screen showing problem vs solution - left side: chaotic scattered papers and documents with flight school information, right side: organized stack of standardized documents with checkmarks"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
