/** Singleton database instance for the Next.js runtime. */
import { createDatabase } from "./index";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL environment variable is required");

export const db = createDatabase(databaseUrl);
