/**
 * Unit tests for keeping repository Terraform environments in sync.
 */
import { describe, expect, it } from "vitest";

import { syncRepositoryTerraformEnvironments } from "../sync-repository-environments.js";

const repositoryConfig = [
  'module "github_repository" {',
  '  source  = "pagopa-dx/github-environment-bootstrap/github"',
  '  version = "~> 1.0"',
  "",
  "  repository = {",
  '    name                   = "my-project"',
  '    description            = "My project"',
  "    topics                 = []",
  "    reviewers_teams        = []",
  "  }",
  "}",
  "",
].join("\n");

describe("syncRepositoryTerraformEnvironments", () => {
  it("adds a non-prod environment while preserving the implicit prod default", () => {
    const result = syncRepositoryTerraformEnvironments(repositoryConfig, "dev");

    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("does not add an explicit environments property when prod is already implicit", () => {
    const result = syncRepositoryTerraformEnvironments(
      repositoryConfig,
      "prod",
    );

    expect(result).toBe(repositoryConfig);
  });

  it("adds the selected environment to an existing explicit list", () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["prod"]\n',
    );

    const result = syncRepositoryTerraformEnvironments(content, "uat");

    expect(result).toContain('    environments           = ["uat", "prod"]');
  });

  it("adds a tenant-qualified environment while preserving the implicit prod default", () => {
    const result = syncRepositoryTerraformEnvironments(
      repositoryConfig,
      "ced-prod",
    );

    expect(result).toContain(
      '    environments           = ["prod", "ced-prod"]',
    );
  });

  it("preserves prod when an existing explicit list does not include it", () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["dev"]\n',
    );

    const result = syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toContain('    environments           = ["dev", "prod"]');
  });

  it("finds a repository block at the beginning of the file", () => {
    const content = [
      "repository = {",
      '  name                   = "my-project"',
      "  reviewers_teams        = []",
      "}",
      "",
    ].join("\n");

    const result = syncRepositoryTerraformEnvironments(content, "uat");

    expect(result).toContain('  environments           = ["uat", "prod"]');
  });

  it("is idempotent when the selected environment already exists", () => {
    const content = repositoryConfig.replace(
      "    reviewers_teams        = []\n",
      '    reviewers_teams        = []\n    environments           = ["dev", "prod"]\n',
    );

    const result = syncRepositoryTerraformEnvironments(content, "dev");

    expect(result).toBe(content);
  });

  it("throws when the repository block is missing", () => {
    expect(() =>
      syncRepositoryTerraformEnvironments('resource "x" "y" {}', "dev"),
    ).toThrow("Cannot find the repository configuration");
  });
});
