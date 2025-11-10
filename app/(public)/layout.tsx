import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/UserMenu";
import { CompareTray } from "@/components/marketplace/CompareTray";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Flight School Finder
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link
                href="/search"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Search
              </Link>
              <Link
                href="/saved"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Saved
              </Link>
              <CompareTray variant="default" />
            </div>
          </div>
          <div>
            <UserMenu />
          </div>
        </div>
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
