import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    authorized: async ({ auth: session }) => !!session,
  },
  providers: [GitHub],
});
