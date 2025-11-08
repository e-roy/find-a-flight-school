"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SeedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SeedSearchInput({
  value,
  onChange,
  placeholder = "Search by name, city, or state...",
}: SeedSearchInputProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}

