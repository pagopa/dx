/** This module loads and resolves configuration for the DX metrics import script. */

import fs from "node:fs";
import { z } from "zod";

const ImportFileConfigSchema = z.object({
  dxRepo: z.string().optional(),
  dxTeamSlug: z.string().min(1),
  organization: z.string().optional(),
  repositories: z.array(z.string()).optional(),
});

export interface EnvironmentOverrides {
  DATABASE_URL?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_TOKEN?: string;
}

export interface GitHubAppAuthSettings {
  appId: number;
  installationId: number;
  privateKey: string;
}

export type GitHubAuthSettings =
  | (GitHubAppAuthSettings & { type: "app" })
  | (GitHubTokenAuthSettings & { type: "token" });

export interface GitHubTokenAuthSettings {
  token: string;
}

export type ImportFileConfig = z.infer<typeof ImportFileConfigSchema>;

export interface ImportSettings {
  databaseUrl?: string;
  dxRepo: string;
  dxTeamSlug: string;
  githubAuth: GitHubAuthSettings;
  organization: string;
  repositories: string[];
}

export function normalizeGitHubAppPrivateKey(privateKey: string): string {
  return privateKey.replaceAll("\\n", "\n").replaceAll("\r\n", "\n");
}

const GitHubAppAuthSchema = z.object({
  appId: z.coerce.number().int().positive(),
  installationId: z.coerce.number().int().positive(),
  privateKey: z.string().min(1).transform(normalizeGitHubAppPrivateKey),
});

const readOptionalEnvironmentString = (value?: string): string | undefined =>
  value && value.trim().length > 0 ? value : undefined;

export function loadImportConfig(filePath: string): ImportFileConfig {
  try {
    const contents = fs.readFileSync(filePath, "utf8");
    const result = ImportFileConfigSchema.safeParse(JSON.parse(contents));
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Error loading config from ${filePath}: ${message}`);
  }
}

export function resolveGitHubAppAuth(
  environment: EnvironmentOverrides,
): GitHubAppAuthSettings | undefined {
  const rawGitHubAppAuth = {
    appId: readOptionalEnvironmentString(environment.GITHUB_APP_ID),
    installationId: readOptionalEnvironmentString(
      environment.GITHUB_APP_INSTALLATION_ID,
    ),
    privateKey: readOptionalEnvironmentString(
      environment.GITHUB_APP_PRIVATE_KEY,
    ),
  };
  const hasAnyGitHubAppCredential = Object.values(rawGitHubAppAuth).some(
    (value) => value !== undefined,
  );

  if (!hasAnyGitHubAppCredential) {
    return undefined;
  }

  if (Object.values(rawGitHubAppAuth).some((value) => value === undefined)) {
    throw new Error(
      "Incomplete GitHub App credentials. Set GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY.",
    );
  }

  const result = GitHubAppAuthSchema.safeParse(rawGitHubAppAuth);

  if (!result.success) {
    throw new Error(
      `Invalid GitHub App credentials: ${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export function resolveGitHubAuth(
  environment: EnvironmentOverrides,
): GitHubAuthSettings {
  const githubApp = resolveGitHubAppAuth(environment);

  if (githubApp) {
    return {
      type: "app",
      ...githubApp,
    };
  }

  const githubToken = readOptionalEnvironmentString(environment.GITHUB_TOKEN);

  if (githubToken) {
    return {
      token: githubToken,
      type: "token",
    };
  }

  throw new Error(
    "GitHub authentication is required. Configure either GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY, or GITHUB_TOKEN.",
  );
}

export function resolveImportSettings(
  fileConfig: ImportFileConfig,
  environment: EnvironmentOverrides,
): ImportSettings {
  return {
    databaseUrl: readOptionalEnvironmentString(environment.DATABASE_URL),
    dxRepo: fileConfig.dxRepo ?? "dx",
    dxTeamSlug: fileConfig.dxTeamSlug,
    githubAuth: resolveGitHubAuth(environment),
    organization: fileConfig.organization ?? "pagopa",
    repositories: fileConfig.repositories ?? [],
  };
}
