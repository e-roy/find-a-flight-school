import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

// Next-auth v5 configuration with Google OAuth and Drizzle adapter
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Include user ID and role in session
      if (session.user && user?.id) {
        session.user.id = user.id;
        
        // Fetch role from auth_users table
        try {
          const userRecord = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);
          
          // Default to "user" if role is not set
          session.user.role = (userRecord[0]?.role as "user" | "school" | "admin") || "user";
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Default to "user" on error
          session.user.role = "user";
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
  },
  secret: process.env.AUTH_SECRET,
});
