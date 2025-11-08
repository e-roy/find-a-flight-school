import { PortalNav } from "@/components/portal/PortalNav";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">School Portal</h1>
        <p className="text-muted-foreground">
          Manage your school profile, view leads, and track analytics
        </p>
      </div>
      <PortalNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}

