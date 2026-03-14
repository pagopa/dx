/** Database factory — creates a Drizzle instance without side effects. */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

export const createDatabase = (connectionString: string) => {
  const pool = new pg.Pool({ connectionString });
  return drizzle(pool, { schema });
};

export type Database = ReturnType<typeof createDatabase>;
