import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/search"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Search
            </Link>
            <Link
              href="#how-it-works"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/for-schools"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              For Schools
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>
          <Separator />
          <p className="text-center text-sm text-muted-foreground">
            © {currentYear} Find-a-Flight-School. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

