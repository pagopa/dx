import type { ActionType } from "plop";

import { Octokit } from "octokit";

import {
  fetchLatestRelease,
  fetchLatestTag,
} from "../adapters/octokit/index.js";
import { fetchLatestSemver } from "./semver.js";

interface TerraformActionsDependencies {
  octokitClient: Octokit;
}

export const getGitHubTerraformProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "integrations";
    const repo = "terraform-provider-github";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "githubTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getPagoPaDxAzureTerraformProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-provider-azure";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "pagopaDxAzureTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getPagoPaDxAwsTerraformProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-provider-aws";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "pagopaDxAwsTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getDxGitHubBootstrapLatestTag =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-github-github-environment-bootstrap";

    return fetchLatestSemver(
      () => fetchLatestTag({ client: octokitClient, owner, repo }),
      answers,
      "dxGithubEnvironmentBootstrapVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getTerraformLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "hashicorp";
    const repo = "terraform";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "terraformVersion",
    );
  };

export const getAwsProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "hashicorp";
    const repo = "terraform-provider-aws";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "awsTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getTlsProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "hashicorp";
    const repo = "terraform-provider-tls";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "tlsTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getAzurermProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "hashicorp";
    const repo = "terraform-provider-azurerm";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "azurermTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getAzureadProviderLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "hashicorp";
    const repo = "terraform-provider-azuread";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "azureadTfProviderVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getPreCommitTerraformLatestRelease =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "antonbabenko";
    const repo = "pre-commit-terraform";

    return fetchLatestSemver(
      () => fetchLatestRelease({ client: octokitClient, owner, repo }),
      answers,
      "preCommitTerraformVersion",
      (version) => `v${version.toString()}`,
    );
  };

export const getDxAwsBootstrapperLatestTag =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-aws-aws-github-environment-bootstrap";

    return fetchLatestSemver(
      () => fetchLatestTag({ client: octokitClient, owner, repo }),
      answers,
      "dxAwsBootstrapperVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getDxAwsCoreValuesExporterLatestTag =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-aws-aws-core-values-exporter";

    return fetchLatestSemver(
      () => fetchLatestTag({ client: octokitClient, owner, repo }),
      answers,
      "dxAwsCoreValuesExporterVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getDxAzureBootstrapperLatestTag =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-azurerm-azure-github-environment-bootstrap";

    return fetchLatestSemver(
      () => fetchLatestTag({ client: octokitClient, owner, repo }),
      answers,
      "dxAzureBootstrapperVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };

export const getDxAzureCoreValuesExporterLatestTag =
  ({ octokitClient }: TerraformActionsDependencies): ActionType =>
  async (answers) => {
    const owner = "pagopa-dx";
    const repo = "terraform-azurerm-azure-core-values-exporter";

    return fetchLatestSemver(
      () => fetchLatestTag({ client: octokitClient, owner, repo }),
      answers,
      "dxAzurermCoreValuesExporterVersion",
      ({ major, minor }) => `${major}.${minor}`,
    );
  };
