"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ContactFormProps {
  schoolId: string;
}

export function ContactForm({ schoolId }: ContactFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const leadMutation = trpc.schools.lead.create.useMutation({
    onSuccess: () => {
      setEmail("");
      setMessage("");
      setEmailError(null);
      setMessageError(null);
    },
    onError: (error) => {
      // tRPC automatically formats Zod validation errors
      // Show error message - if it's field-specific, it will be in the message
      const errorMessage = error.message || "Failed to submit contact form";

      // Try to parse field-specific errors from the message
      if (
        errorMessage.includes("email") ||
        errorMessage.toLowerCase().includes("invalid email")
      ) {
        setEmailError(errorMessage);
      } else if (
        errorMessage.includes("message") ||
        errorMessage.includes("at least")
      ) {
        setMessageError(errorMessage);
      } else {
        // General error - show on message field
        setMessageError(errorMessage);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setMessageError(null);

    leadMutation.mutate({
      schoolId,
      email,
      message,
    });
  };

  const isSuccess = leadMutation.isSuccess;
  const isSubmitting = leadMutation.isPending;

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact School</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              Thank you! Your message has been sent. The school will contact you
              soon.
            </p>
          </div>
          <Button
            onClick={() => leadMutation.reset()}
            variant="outline"
            className="mt-4"
          >
            Send Another Message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact School</CardTitle>
        <CardDescription>
          Send a message to this flight school to learn more about their
          programs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              disabled={isSubmitting}
              aria-invalid={emailError ? "true" : "false"}
              aria-describedby={emailError ? "email-error" : undefined}
            />
            {emailError && (
              <p id="email-error" className="text-sm text-destructive">
                {emailError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Tell the school about your interest in their programs..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageError(null);
              }}
              disabled={isSubmitting}
              rows={5}
              aria-invalid={messageError ? "true" : "false"}
              aria-describedby={messageError ? "message-error" : undefined}
            />
            {messageError && (
              <p id="message-error" className="text-sm text-destructive">
                {messageError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!email || !message || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
