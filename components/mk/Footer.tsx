import * as React from "react";
import Link from "next/link";
import { GitHubMark } from "@/components/mk/icons";

const REPO_URL = "https://github.com/e-roy/find-a-flight-school";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] =
  [
    {
      heading: "Explore",
      links: [
        { label: "Search schools", href: "/search" },
        { label: "Compare", href: "/compare" },
        { label: "Saved", href: "/saved" },
      ],
    },
    {
      heading: "For schools",
      links: [
        { label: "List your school", href: "/add-school" },
        { label: "Claim a profile", href: "/claim" },
      ],
    },
  ];

export function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-shell mk-footer__in">
        <div className="mk-footer__brand">
          <Link className="mk-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" width={32} height={32} alt="" />
            <span
              className="mk-brand__word"
              style={{ color: "var(--text-on-dark)" }}
            >
              Find a <em>Flight</em> School
            </span>
          </Link>
          <p className="mk-footer__tag">Student-first. School-agnostic.</p>
          <a
            className="mk-footer__repo"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubMark size={16} /> View source on GitHub
          </a>
        </div>
        {COLUMNS.map((col) => (
          <div className="mk-footer__col" key={col.heading}>
            <span className="mk-footer__h">{col.heading}</span>
            {col.links.map((l) => (
              <Link key={l.label} href={l.href} className="mk-footer__link">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mk-shell mk-footer__bar">
        <span className="mk-footer__copy">
          © 2026 Find a Flight School. Not affiliated with the FAA. Data may be
          incomplete — verify with the school.
        </span>
        <div className="mk-footer__legal">
          <Link href="/terms" className="mk-footer__link">
            Terms
          </Link>
          <Link href="/privacy" className="mk-footer__link">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
