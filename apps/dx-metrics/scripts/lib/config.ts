/** This module loads and resolves configuration for the DX metrics import script. */

import fs from "node:fs";
import { z } from "zod";

const ImportFileConfigSchema = z.object({
  dxRepo: z.string().optional(),
  dxTeamMembers: z.array(z.string()).optional(),
  organization: z.string().optional(),
  repositories: z.array(z.string()).optional(),
});

export interface EnvironmentOverrides {
  DATABASE_URL?: string;
  GITHUB_TOKEN?: string;
}

export type ImportFileConfig = z.infer<typeof ImportFileConfigSchema>;

export interface ImportSettings {
  databaseUrl?: string;
  dxRepo: string;
  dxTeamMembers: string[];
  githubToken?: string;
  organization: string;
  repositories: string[];
}

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

export function resolveImportSettings(
  fileConfig: ImportFileConfig,
  environment: EnvironmentOverrides,
): ImportSettings {
  return {
    databaseUrl: readOptionalEnvironmentString(environment.DATABASE_URL),
    dxRepo: fileConfig.dxRepo ?? "dx",
    dxTeamMembers: fileConfig.dxTeamMembers ?? [],
    githubToken: readOptionalEnvironmentString(environment.GITHUB_TOKEN),
    organization: fileConfig.organization ?? "pagopa",
    repositories: fileConfig.repositories ?? [],
  };
}
