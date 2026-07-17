"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonClass } from "@/components/core/Button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search schools" },
  { href: "/compare", label: "Compare" },
  { href: "/saved", label: "Saved" },
];

export interface HeaderProps {
  userMenu?: React.ReactNode;
}

export function Header({ userMenu }: HeaderProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href) || pathname.startsWith("/schools");
  }

  return (
    <header className="mk-header">
      <div className="mk-shell mk-header__in">
        <Link className="mk-brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" width={34} height={34} alt="" />
          <span className="mk-brand__word">
            Find a <em>Flight</em> School
          </span>
        </Link>
        <nav className="mk-nav">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn("mk-nav__link", isActive(l.href) && "is-active")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mk-header__cta">
          <Link href="/add-school" className={buttonClass("navy", "sm")}>
            List your school
          </Link>
          {userMenu}
        </div>
      </div>
    </header>
  );
}
