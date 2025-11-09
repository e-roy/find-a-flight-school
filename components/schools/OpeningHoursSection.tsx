"use client";

import { FactSection } from "./FactSection";
import { Clock } from "lucide-react";

interface OpeningHoursProps {
  openNow?: boolean;
  periods?: Array<{
    open: { day: number; hour: number; minute: number };
    close: { day: number; hour: number; minute: number };
  }>;
  weekdayText?: string[];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

export function OpeningHoursSection({ openNow, periods, weekdayText }: OpeningHoursProps) {
  if (!periods && !weekdayText) {
    return null;
  }

  return (
    <FactSection title="Opening Hours" icon={<Clock className="h-5 w-5" />}>
      <div className="space-y-3">
        {openNow !== undefined && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
            <p className="text-sm">
              {openNow ? (
                <span className="text-green-600 dark:text-green-400">Open Now</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Closed</span>
              )}
            </p>
          </div>
        )}

        {weekdayText && weekdayText.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Hours</p>
            <div className="space-y-1">
              {weekdayText.map((text, index) => (
                <p key={index} className="text-sm">
                  {text}
                </p>
              ))}
            </div>
          </div>
        ) : periods && periods.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Hours</p>
            <div className="space-y-1">
              {periods.map((period, index) => {
                const dayName = DAYS[period.open.day] || `Day ${period.open.day}`;
                const openTime = formatTime(period.open.hour, period.open.minute);
                const closeTime = formatTime(period.close.hour, period.close.minute);
                return (
                  <p key={index} className="text-sm">
                    <span className="font-medium">{dayName}:</span> {openTime} - {closeTime}
                  </p>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </FactSection>
  );
}

