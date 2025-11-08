"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PortalNav() {
  const pathname = usePathname();
  
  const tabs = [
    { name: "Overview", href: "/portal" },
    { name: "Profile", href: "/portal/profile" },
    { name: "Leads", href: "/portal/leads" },
    { name: "Analytics", href: "/portal/analytics" },
  ];

  return (
    <nav className="border-b">
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                "border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

