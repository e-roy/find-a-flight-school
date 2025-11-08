import { signOut, auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export default async function SignOutPage() {
  const session = await auth();

  // If not signed in, redirect to home
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Sign Out</h1>
          <p className="text-muted-foreground">
            Are you sure you want to sign out?
          </p>
        </div>

        <div className="space-y-4">
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button
              type="submit"
              variant="default"
              className="w-full"
              size="lg"
            >
              Sign Out
            </Button>
          </form>

          <Button asChild variant="outline" className="w-full" size="lg">
            <a href="/">Cancel</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
