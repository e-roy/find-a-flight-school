import type { Metadata } from "next";
import Link from "next/link";
import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { GoogleG } from "@/components/mk/icons";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to save schools, claim your school's profile, and manage leads. Searching and adding a school don't require an account.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sign In - Find a Flight School",
    description:
      "Sign in to access your account and manage your flight school profile.",
    type: "website",
    url: `${baseUrl}/sign-in`,
  },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (session?.user) {
    redirect(params.callbackUrl || "/");
  }

  return (
    <div className="mk-root">
      <div className="mk-auth">
        <div className="mk-auth__card">
          <div className="mk-auth__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.svg" width={46} height={46} alt="" />
            <h1 className="mk-auth__title">Sign in to continue</h1>
            <p className="mk-auth__lead">
              Save schools, claim your school&apos;s profile, and manage leads.
              Searching and adding a school don&apos;t require an account.
            </p>
          </div>

          <form
            style={{ marginTop: 28 }}
            action={async (formData: FormData) => {
              "use server";
              const callbackUrl =
                (formData.get("callbackUrl") as string) || "/";
              await signIn("google", { redirectTo: callbackUrl });
            }}
          >
            {params.callbackUrl && (
              <input
                type="hidden"
                name="callbackUrl"
                value={params.callbackUrl}
              />
            )}
            <button type="submit" className="mk-gbtn">
              <GoogleG size={19} />
              Continue with Google
            </button>
          </form>

          <div className="mk-auth__divider">or</div>

          <Link href="/search" className="mk-gbtn">
            <Search size={18} /> Browse schools without signing in
          </Link>

          <p className="mk-auth__alt">
            Run a flight school?{" "}
            <Link href="/add-school">Add it to the directory →</Link>
          </p>

          <p className="mk-auth__fine">
            By continuing you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>. We use Google only to
            verify your identity — we never post on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}
