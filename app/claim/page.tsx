"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClaimPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [open, setOpen] = useState(false);

  const { data: schoolsList, isLoading: isLoadingSchools } = trpc.schools.list.useQuery({
    limit: 100,
    offset: 0,
  });

  const selectedSchool = schoolsList?.find((s) => s.id === schoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/claim/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitStatus("error");
        setErrorMessage(data.error || "Failed to submit claim request");
      } else {
        setSubmitStatus("success");
        setEmail("");
        setSchoolId("");
      }
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Claim Your Flight School</CardTitle>
          <CardDescription>
            Verify ownership of your flight school to submit edits and updates to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitStatus === "success" ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Verification email sent! Please check your inbox and click the verification link.
                </p>
              </div>
              <Button
                onClick={() => {
                  setSubmitStatus("idle");
                  setSchoolId("");
                  setEmail("");
                }}
                variant="outline"
              >
                Submit Another Claim
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="school">Flight School</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between"
                      disabled={isLoadingSchools}
                    >
                      {selectedSchool
                        ? selectedSchool.canonicalName
                        : "Select a flight school..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search schools..." />
                      <CommandList>
                        <CommandEmpty>No schools found.</CommandEmpty>
                        <CommandGroup>
                          {schoolsList?.map((school) => (
                            <CommandItem
                              key={school.id}
                              value={school.canonicalName}
                              onSelect={() => {
                                setSchoolId(school.id);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  schoolId === school.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {school.canonicalName}
                              {school.domain && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({school.domain})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedSchool?.domain && (
                  <p className="text-xs text-muted-foreground">
                    Your email must be from the domain: {selectedSchool.domain}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!schoolId || isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a verification email to this address. The email domain must match your school's domain.
                </p>
              </div>

              {submitStatus === "error" && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
                </div>
              )}

              <Button type="submit" disabled={!schoolId || !email || isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Request Verification"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

