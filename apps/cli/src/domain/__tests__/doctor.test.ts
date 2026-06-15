/**
 * Tests for the `runDoctor` domain orchestration.
 *
 * Focuses on the failure path where a repository check rejects unexpectedly,
 * ensuring the result surfaces a meaningful check instead of an empty list.
 */

import { errAsync, ok, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Config } from "../../config.js";
import type { Dependencies, GitHubAuthFactory } from "../dependencies.js";
import type { PackageJsonReader } from "../package-json.js";
import type { RepositoryReader } from "../repository.js";

import { runDoctor } from "../doctor.js";
import { checkMonorepoScripts } from "../package-json.js";
import { checkNxConfig, checkPreCommitConfig } from "../repository.js";
import { checkWorkspaces } from "../workspace.js";

vi.mock("../package-json.js", () => ({
  checkMonorepoScripts: vi.fn(),
}));
vi.mock("../repository.js", () => ({
  checkNxConfig: vi.fn(),
  checkPreCommitConfig: vi.fn(),
}));
vi.mock("../workspace.js", () => ({
  checkWorkspaces: vi.fn(),
}));

const config: Config = { minVersions: { nx: "22" } };

const makeDependencies = (): Dependencies => {
  const packageJsonReader: PackageJsonReader = {
    getDependencies: vi.fn(),
    getRootRequiredScripts: vi.fn(() => new Map()),
    getScripts: vi.fn(),
    readPackageJson: vi.fn(),
  };

  const repositoryReader: RepositoryReader = {
    fileExists: vi.fn(() => okAsync(false)),
    findRepositoryRoot: vi.fn(() => okAsync("a/repo/root")),
    getWorkspaces: vi.fn(),
    readFile: vi.fn(),
  };

  const requireGitHubAuth: GitHubAuthFactory = () =>
    errAsync(new Error("not used by the doctor command"));

  return {
    packageJsonReader,
    repositoryReader,
    requireGitHubAuth,
  };
};

describe("runDoctor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces a meaningful check when a repository check rejects", async () => {
    vi.mocked(checkPreCommitConfig).mockRejectedValue(new Error("boom"));
    vi.mocked(checkNxConfig).mockResolvedValue(
      ok({
        checkName: "Nx Configuration",
        isValid: true,
        successMessage: "ok",
      }),
    );
    vi.mocked(checkMonorepoScripts).mockResolvedValue(
      ok({
        checkName: "Monorepo Scripts",
        isValid: true,
        successMessage: "ok",
      }),
    );
    vi.mocked(checkWorkspaces).mockResolvedValue(
      ok({ checkName: "Workspaces", isValid: true, successMessage: "ok" }),
    );

    const result = await runDoctor(makeDependencies(), config);

    expect(result.hasErrors).toBe(true);
    expect(result.checks).toStrictEqual([
      {
        checkName: "Repository Checks",
        errorMessage:
          "Could not complete the repository checks: Error checking pre-commit configuration",
        isValid: false,
      },
    ]);
  });
});
