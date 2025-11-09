"use client";

import { FactSection, FactItem } from "./FactSection";
import { Mail, Phone, Globe, ExternalLink } from "lucide-react";
import type { schools } from "@/db/schema/schools";

type School = typeof schools.$inferSelect;

interface ContactSectionProps {
  school: School;
  email?: string;
  phone?: string;
}

export function ContactSection({ school, email, phone }: ContactSectionProps) {
  const hasContact = email || phone || school.domain;

  if (!hasContact) {
    return null;
  }

  return (
    <FactSection title="Contact" icon={<Mail className="h-5 w-5" />}>
      <div className="space-y-3">
        {email && (
          <FactItem
            label="Email"
            value={
              <a
                href={`mailto:${email}`}
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                {email}
              </a>
            }
          />
        )}
        {phone && (
          <FactItem
            label="Phone"
            value={
              <a
                href={`tel:${phone}`}
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                {phone}
              </a>
            }
          />
        )}
        {school.domain && (
          <FactItem
            label="Website"
            value={
              <a
                href={`https://${school.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                {school.domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            }
          />
        )}
      </div>
    </FactSection>
  );
}
