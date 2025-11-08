"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function SignInButton() {
  const router = useRouter();

  const handleSignIn = () => {
    router.push("/sign-in");
  };

  return (
    <Button onClick={handleSignIn} variant="outline" size="sm">
      Sign In
    </Button>
  );
}

