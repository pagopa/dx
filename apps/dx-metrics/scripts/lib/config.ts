/** This module loads and resolves configuration for the DX metrics import script. */

import fs from "fs";
import yaml from "js-yaml";

export interface ImportFileConfig {
  organization?: string;
  repositories?: string[];
  dx_team_members?: string[];
  dx_repo?: string;
}

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readOptionalString = (
  source: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
};

const readOptionalStringArray = (
  source: Record<string, unknown>,
  key: string,
): string[] | undefined => {
  const value = source[key];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return undefined;
  }

  return value;
};

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

function parseImportConfig(document: unknown): ImportFileConfig {
  if (!isRecord(document)) {
    throw new Error("Config file must define a YAML object.");
  }

  return {
    organization: readOptionalString(document, "organization"),
    repositories: readOptionalStringArray(document, "repositories"),
    dx_team_members: readOptionalStringArray(document, "dx_team_members"),
    dx_repo: readOptionalString(document, "dx_repo"),
  };
}

export function loadImportConfig(filePath: string): ImportFileConfig {
  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    return parseImportConfig(yaml.load(fileContents));
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
      fileConfig.dx_team_members ??
      [],
    dxRepo:
      readOptionalEnvironmentString(environment.DX_REPO) ??
      fileConfig.dx_repo ??
      "dx",
    databaseUrl: readOptionalEnvironmentString(environment.DATABASE_URL),
    githubToken: readOptionalEnvironmentString(environment.GITHUB_TOKEN),
  };
}
