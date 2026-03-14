/** Better Auth server configuration with GitHub OAuth and Drizzle adapter. */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";

import { db } from "@/db/instance";

const AuthEnvSchema = z.object({
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
});

const env = AuthEnvSchema.parse({
  AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
  AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
});

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  // nextCookies must be the last plugin to auto-set cookies in server actions
  plugins: [nextCookies()],
  socialProviders: {
    github: {
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
    },
  },
});
