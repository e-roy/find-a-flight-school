"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [schoolId, setSchoolId] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/claim/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setErrorMessage(data.error || "Verification failed");
        } else {
          setStatus("success");
          setSchoolId(data.schoolId);
        }
      } catch (error) {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred");
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Verify Your Claim</CardTitle>
          <CardDescription>
            Verifying your email address and claim...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your claim...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">Claim verified successfully!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can now edit your school profile. Your changes will be submitted for moderation.
              </p>
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/claim/edit?schoolId=${schoolId}`}>
                    Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/schools/${schoolId}`}>
                    View School Page
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                <p className="font-medium">Verification failed</p>
              </div>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button variant="outline" asChild>
                <Link href="/claim">Request New Verification</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

