import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL environment variable is required");

const pool = new pg.Pool({ connectionString: databaseUrl });

export const db = drizzle(pool, { schema });
export type Database = typeof db;
