/** This module creates and manages the shared runtime context for importers. */

import pg from "pg";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../src/db/schema";
import type { ImportSettings } from "./config";
import type { Octokit } from "octokit";

const createDatabaseConnection = (connectionString?: string) => {
  const pool = connectionString
    ? new pg.Pool({ connectionString })
    : new pg.Pool();
  const db = drizzle(pool, { schema });

  return { pool, db };
};

type DatabaseConnection = ReturnType<typeof createDatabaseConnection>;

export type ImportDatabase = DatabaseConnection["db"];
export type ImportPool = DatabaseConnection["pool"];

export interface ImportContext {
  organization: string;
  repositories: string[];
  dxTeamMembers: string[];
  dxRepo: string;
  pool: ImportPool;
  db: ImportDatabase;
  octokit: Octokit;
  ensureRepo: (name: string) => Promise<number>;
}

// We use a dynamic import as module resolution is set to bundler
// which doesn't support conditional exports.
const createOctokitClient = async (githubToken?: string): Promise<Octokit> => {
  const { Octokit } = await import("octokit");

  return githubToken ? new Octokit({ auth: githubToken }) : new Octokit();
};

export async function createImportContext(
  settings: ImportSettings,
): Promise<ImportContext> {
  const { databaseUrl, githubToken, ...config } = settings;
  const { pool, db } = createDatabaseConnection(databaseUrl);
  const octokit = await createOctokitClient(githubToken);

  const ensureRepo = async (name: string): Promise<number> => {
    const fullName = `${config.organization}/${name}`;

    const existing = await db
      .select()
      .from(schema.repositories)
      .where(sql`${schema.repositories.fullName} = ${fullName}`)
      .limit(1);

    if (existing.length > 0) {
      return existing[0].id;
    }

    const { data } = await octokit.rest.repos.get({
      owner: config.organization,
      repo: name,
    });

    await db
      .insert(schema.repositories)
      .values({
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        organization: config.organization,
      })
      .onConflictDoNothing();

    return data.id;
  };

  return {
    ...config,
    pool,
    db,
    octokit,
    ensureRepo,
  };
}

export async function seedConfig(context: ImportContext): Promise<void> {
  console.log("  Seeding config and DX team members...");

  await context.db
    .insert(schema.config)
    .values({ key: "organization", value: context.organization })
    .onConflictDoUpdate({
      target: schema.config.key,
      set: { value: context.organization },
    });

  await context.db
    .insert(schema.config)
    .values({ key: "dx_repo", value: context.dxRepo })
    .onConflictDoUpdate({
      target: schema.config.key,
      set: { value: context.dxRepo },
    });

  for (const member of context.dxTeamMembers) {
    await context.db
      .insert(schema.dxTeamMembers)
      .values({ username: member })
      .onConflictDoNothing();
  }

  console.log("    ✓ Config seeded");
}

export async function closeImportContext(
  context: ImportContext,
): Promise<void> {
  await context.pool.end();
}
