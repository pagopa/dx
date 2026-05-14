/** Database helpers shared by the DX Metrics portal and importer runtimes. */

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema";

export const createDatabaseConnection = (connectionString?: string) => {
  const pool = connectionString
    ? new pg.Pool({ connectionString })
    : new pg.Pool();
  const db = drizzle(pool, { schema });

  return { db, pool };
};

export const createDatabase = (connectionString?: string) =>
  createDatabaseConnection(connectionString).db;

export type Database = ReturnType<typeof createDatabase>;
export type DatabaseConnection = ReturnType<typeof createDatabaseConnection>;
