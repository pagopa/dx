/** This module loads and resolves configuration for the DX metrics import script. */

import fs from "node:fs";

import { z } from "zod";

const ImportFileConfigSchema = z.object({
  organization: z.string().optional(),
  repositories: z.array(z.string()).optional(),
  dxTeamMembers: z.array(z.string()).optional(),
  dxRepo: z.string().optional(),
});

export type ImportFileConfig = z.infer<typeof ImportFileConfigSchema>;

export interface EnvironmentOverrides {
  ORGANIZATION?: string;
  REPOSITORIES?: string;
  DX_TEAM_MEMBERS?: string;
  DX_REPO?: string;
  DATABASE_URL?: string;
  GITHUB_TOKEN?: string;
}

export interface ImportSettings {
  organization: string;
  repositories: string[];
  dxTeamMembers: string[];
  dxRepo: string;
  databaseUrl?: string;
  githubToken?: string;
}

const readOptionalEnvironmentString = (value?: string): string | undefined =>
  value && value.trim().length > 0 ? value : undefined;

const readOptionalEnvironmentList = (value?: string): string[] | undefined => {
  const normalizedValue = readOptionalEnvironmentString(value);
  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

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

export function resolveImportSettings(
  fileConfig: ImportFileConfig,
  environment: EnvironmentOverrides,
): ImportSettings {
  return {
    organization:
      readOptionalEnvironmentString(environment.ORGANIZATION) ??
      fileConfig.organization ??
      "pagopa",
    repositories:
      readOptionalEnvironmentList(environment.REPOSITORIES) ??
      fileConfig.repositories ??
      [],
    dxTeamMembers:
      readOptionalEnvironmentList(environment.DX_TEAM_MEMBERS) ??
      fileConfig.dxTeamMembers ??
      [],
    dxRepo:
      readOptionalEnvironmentString(environment.DX_REPO) ??
      fileConfig.dxRepo ??
      "dx",
    databaseUrl: readOptionalEnvironmentString(environment.DATABASE_URL),
    githubToken: readOptionalEnvironmentString(environment.GITHUB_TOKEN),
  };
}

