/** Singleton database instance for the Next.js runtime. */
import { createDatabase } from "@pagopa/dx-metrics-core/database";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL environment variable is required");

export const db = createDatabase(databaseUrl);
