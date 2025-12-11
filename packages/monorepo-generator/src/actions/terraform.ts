import type { ActionType } from "plop";

import { Octokit } from "octokit";
import { SemVer } from "semver";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";
import { fetchLatestSemver } from "./semver.js";

interface SemverFetchOptions {
  formatVersion?: (version: SemVer) => string;
  repository: { name: string; owner: string };
  resultKey: string;
  source?: "release" | "tag";
}

interface TerraformActionsDependencies {
  octokitClient: Octokit;
}

const makeSemverFetchAction =
  ({
    formatVersion,
    repository,
    resultKey,
    source = "release",
  }: SemverFetchOptions) =>
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  (answers) =>
    fetchLatestSemver(
      () =>
        (source === "tag" ? fetchLatestTag : fetchLatestRelease)({
          client: octokitClient,
          owner: repository.owner,
          repo: repository.name,
        }),
      answers,
      resultKey,
      formatVersion,
    );

const getGitHubTerraformProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-github", owner: "integrations" },
  resultKey: "githubTfProviderVersion",
});

const getPagoPaDxAzureTerraformProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-azure", owner: "pagopa-dx" },
  resultKey: "pagopaDxAzureTfProviderVersion",
});

const getPagoPaDxAwsTerraformProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-aws", owner: "pagopa-dx" },
  resultKey: "pagopaDxAwsTfProviderVersion",
});

const getDxGitHubBootstrapLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: {
    name: "terraform-github-github-environment-bootstrap",
    owner: "pagopa-dx",
  },
  resultKey: "dxGithubEnvironmentBootstrapVersion",
  source: "tag",
});

const getTerraformLatestVersion = makeSemverFetchAction({
  repository: { name: "terraform", owner: "hashicorp" },
  resultKey: "terraformVersion",
});

const getAwsProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-aws", owner: "hashicorp" },
  resultKey: "awsTfProviderVersion",
});

const getTlsProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-tls", owner: "hashicorp" },
  resultKey: "tlsTfProviderVersion",
});

const getAzurermProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-azurerm", owner: "hashicorp" },
  resultKey: "azurermTfProviderVersion",
});

const getAzureadProviderLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: { name: "terraform-provider-azuread", owner: "hashicorp" },
  resultKey: "azureadTfProviderVersion",
});

const getPreCommitTerraformLatestVersion = makeSemverFetchAction({
  formatVersion: (version) => `v${version.toString()}`,
  repository: { name: "pre-commit-terraform", owner: "antonbabenko" },
  resultKey: "preCommitTerraformVersion",
});

const getDxAwsBootstrapperLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: {
    name: "terraform-aws-aws-github-environment-bootstrap",
    owner: "pagopa-dx",
  },
  resultKey: "dxAwsBootstrapperVersion",
  source: "tag",
});

const getDxAwsCoreValuesExporterLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: {
    name: "terraform-aws-aws-core-values-exporter",
    owner: "pagopa-dx",
  },
  resultKey: "dxAwsCoreValuesExporterVersion",
  source: "tag",
});

const getDxAzureBootstrapperLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: {
    name: "terraform-azurerm-azure-github-environment-bootstrap",
    owner: "pagopa-dx",
  },
  resultKey: "dxAzureBootstrapperVersion",
  source: "tag",
});

const getDxAzureCoreValuesExporterLatestVersion = makeSemverFetchAction({
  formatVersion: ({ major, minor }) => `${major}.${minor}`,
  repository: {
    name: "terraform-azurerm-azure-core-values-exporter",
    owner: "pagopa-dx",
  },
  resultKey: "dxAzurermCoreValuesExporterVersion",
  source: "tag",
});

export const terraformVersionActions = (
  deps: TerraformActionsDependencies,
): ActionType[] => [
  getGitHubTerraformProviderLatestVersion(deps),
  getAwsProviderLatestVersion(deps),
  getTlsProviderLatestVersion(deps),
  getAzurermProviderLatestVersion(deps),
  getAzureadProviderLatestVersion(deps),
  getDxGitHubBootstrapLatestVersion(deps),
  getDxAzureBootstrapperLatestVersion(deps),
  getTerraformLatestVersion(deps),
  getPreCommitTerraformLatestVersion(deps),
  getDxAwsBootstrapperLatestVersion(deps),
  getDxAwsCoreValuesExporterLatestVersion(deps),
  getDxAzureCoreValuesExporterLatestVersion(deps),
  getPagoPaDxAzureTerraformProviderLatestVersion(deps),
  getPagoPaDxAwsTerraformProviderLatestVersion(deps),
];
