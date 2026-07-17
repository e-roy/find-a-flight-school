import { Header } from "@/components/mk/Header";
import { Footer } from "@/components/mk/Footer";
import { UserMenu } from "@/components/auth/UserMenu";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mk-root">
      <Header userMenu={<UserMenu />} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
