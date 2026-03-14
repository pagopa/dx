/** This module creates and manages the shared runtime context for importers. */

import type { Octokit } from "octokit";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import type { ImportSettings } from "./config";

import * as schema from "../../src/db/schema";

const createDatabaseConnection = (connectionString?: string) => {
  const pool = connectionString
    ? new pg.Pool({ connectionString })
    : new pg.Pool();
  const db = drizzle(pool, { schema });

  return { db, pool };
};

export interface ImportContext {
  db: ImportDatabase;
  dxRepo: string;
  dxTeamMembers: string[];
  ensureRepo: (name: string) => Promise<number>;
  octokit: Octokit;
  organization: string;
  pool: ImportPool;
  repositories: string[];
}

export type ImportDatabase = DatabaseConnection["db"];
export type ImportPool = DatabaseConnection["pool"];

export interface TeamMembersClient {
  paginate: (
    route: string,
    parameters: {
      readonly org: string;
      readonly per_page: number;
      readonly team_slug: string;
    },
    mapFn: (response: TeamMembersPage) => readonly string[],
  ) => Promise<readonly string[]>;
}

type DatabaseConnection = ReturnType<typeof createDatabaseConnection>;

interface TeamMembersPage {
  readonly data: readonly { readonly login: string }[];
}

const toSortedUniqueMembers = (members: readonly string[]): string[] =>
  [...new Set(members)].sort();

// We use a dynamic import as module resolution is set to bundler
// which doesn't support conditional exports.
const createOctokitClient = async (githubToken?: string): Promise<Octokit> => {
  const { Octokit } = await import("octokit");

  return githubToken ? new Octokit({ auth: githubToken }) : new Octokit();
};

/** Resolves DX team members from the configured GitHub team slug. */
export const resolveDxTeamMembers = async (
  teamMembersClient: TeamMembersClient,
  settings: Pick<ImportSettings, "dxTeamSlug" | "organization">,
): Promise<string[]> => {
  const members = await teamMembersClient.paginate(
    "GET /orgs/{org}/teams/{team_slug}/members",
    {
      org: settings.organization,
      per_page: 100,
      team_slug: settings.dxTeamSlug,
    },
    (response) => response.data.map((member) => member.login),
  );

  return toSortedUniqueMembers(members);
};

export async function closeImportContext(
  context: ImportContext,
): Promise<void> {
  await context.pool.end();
}

export async function createImportContext(
  settings: ImportSettings,
): Promise<ImportContext> {
  const { databaseUrl, githubToken, ...config } = settings;
  const { db, pool } = createDatabaseConnection(databaseUrl);
  const octokit = await createOctokitClient(githubToken);
  const dxTeamMembers = await resolveDxTeamMembers(octokit, config);

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
        fullName: data.full_name,
        id: data.id,
        name: data.name,
        organization: config.organization,
      })
      .onConflictDoNothing();

    return data.id;
  };

  return {
    db,
    dxRepo: config.dxRepo,
    dxTeamMembers,
    ensureRepo,
    octokit,
    organization: config.organization,
    pool,
    repositories: config.repositories,
  };
}

export async function seedConfig(context: ImportContext): Promise<void> {
  console.log("  Seeding config and DX team members...");

  await context.db
    .insert(schema.config)
    .values({ key: "organization", value: context.organization })
    .onConflictDoUpdate({
      set: { value: context.organization },
      target: schema.config.key,
    });

  await context.db
    .insert(schema.config)
    .values({ key: "dx_repo", value: context.dxRepo })
    .onConflictDoUpdate({
      set: { value: context.dxRepo },
      target: schema.config.key,
    });

  for (const member of context.dxTeamMembers) {
    await context.db
      .insert(schema.dxTeamMembers)
      .values({ username: member })
      .onConflictDoNothing();
  }

  console.log("    ✓ Config seeded");
}
