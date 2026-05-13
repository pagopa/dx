/** This module creates and manages the shared runtime context for importers. */

import { createAppAuth } from "@octokit/auth-app";
import {
  createDatabaseConnection,
  type DatabaseConnection,
} from "@pagopa/dx-metrics-core/database";
import * as schema from "@pagopa/dx-metrics-core/schema";
import { sql } from "drizzle-orm";
import { Octokit } from "octokit";

import type {
  GitHubAppAuthSettings,
  GitHubAuthSettings,
  ImportSettings,
} from "./config";

export interface ImportContext {
  db: ImportDatabase;
  dxRepo: string;
  dxTeamMembers: string[];
  ensureRepo: (name: string) => Promise<number>;
  octokit: Octokit;
  organization: string;
  pool: ImportPool;
  repositories: string[];
  resolveTerrawizGitHubToken: ResolveTerrawizGitHubToken;
  runtimeEnvironment: NodeJS.ProcessEnv;
}

export type ImportDatabase = DatabaseConnection["db"];
export type ImportPool = DatabaseConnection["pool"];
export type ResolveTerrawizGitHubToken = () => Promise<string>;

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

interface TeamMembersPage {
  readonly data: readonly { readonly login: string }[];
}

const toSortedUniqueMembers = (members: readonly string[]): string[] =>
  [...new Set(members)].sort();

export const buildGitHubAppOctokitAuthOptions = (
  githubApp: GitHubAppAuthSettings,
): Parameters<typeof createAppAuth>[0] => ({
  appId: githubApp.appId,
  installationId: githubApp.installationId,
  privateKey: githubApp.privateKey,
});

export const createOctokitClient = (githubAuth: GitHubAuthSettings): Octokit =>
  githubAuth.type === "app"
    ? new Octokit({
        auth: buildGitHubAppOctokitAuthOptions(githubAuth),
        authStrategy: createAppAuth,
      })
    : new Octokit({ auth: githubAuth.token });

const createGitHubAppInstallationTokenResolver = (
  githubApp: GitHubAppAuthSettings,
): ResolveTerrawizGitHubToken => {
  const auth = createAppAuth(buildGitHubAppOctokitAuthOptions(githubApp));

  return async () => {
    const authentication = await auth({ type: "installation" });
    return authentication.token;
  };
};

export const createTerrawizGitHubTokenResolver = (
  githubAuth: GitHubAuthSettings,
  createInstallationTokenResolver: (
    githubApp: GitHubAppAuthSettings,
  ) => ResolveTerrawizGitHubToken = createGitHubAppInstallationTokenResolver,
): ResolveTerrawizGitHubToken =>
  githubAuth.type === "app"
    ? createInstallationTokenResolver(githubAuth)
    : async () => githubAuth.token;

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
  runtimeEnvironment: NodeJS.ProcessEnv,
): Promise<ImportContext> {
  const { databaseUrl, githubAuth, ...config } = settings;
  const { db, pool } = createDatabaseConnection(databaseUrl);
  const octokit = createOctokitClient(githubAuth);
  const dxTeamMembers = await resolveDxTeamMembers(octokit, config);
  const resolveTerrawizGitHubToken =
    createTerrawizGitHubTokenResolver(githubAuth);

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
    resolveTerrawizGitHubToken,
    runtimeEnvironment,
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
