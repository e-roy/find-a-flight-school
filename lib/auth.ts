import { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";

// Basic next-auth configuration
// TODO(question): Which auth provider should we use for MVP? (e.g., credentials, OAuth)
export const authOptions: NextAuthOptions = {
  providers: [
    // Add providers here when implementing authentication
    // For now, this is a placeholder that allows the tRPC context to work
  ],
  callbacks: {
    session: ({ session }) => session,
  },
  pages: {
    // Customize auth pages if needed
  },
};

export async function auth() {
  return getServerSession(authOptions);
}

