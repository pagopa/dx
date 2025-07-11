import { err, ok, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { DependencyName } from "../package-json.js";
import { checkPreCommitConfig, checkTurboConfig } from "../repository.js";
import { checkWorkspaces } from "../workspace.js";
import { workspaceSchema } from "../workspace.js";
import { makeMockConfig, makeMockDependencies } from "./data.js";

describe("checkPreCommitConfig", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should return ok result with successful validation when .pre-commit-config.yaml exists", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsPreCommitConfig.mockReturnValueOnce(ok(true));

    const result = await checkPreCommitConfig(monorepoDir)(deps);

    expect(result).toStrictEqual(
      ok({
        checkName: "Pre-commit Configuration",
        isValid: true,
        successMessage:
          "Pre-commit configuration is present in the repository root",
      }),
    );
  });

  it("should return ok result with failed validation when .pre-commit-config.yaml does not exist", async () => {
    const deps = makeMockDependencies();

    const errorMessage =
      ".pre-commit-config.yaml not found in repository root. Make sure to have pre-commit configured for the repository.";
    deps.repositoryReader.existsPreCommitConfig.mockReturnValueOnce(
      err(new Error(errorMessage)),
    );

    const result = await checkPreCommitConfig(monorepoDir)(deps);

    expect(result).toStrictEqual(
      ok({
        checkName: "Pre-commit Configuration",
        errorMessage,
        isValid: false,
      }),
    );
  });
});

describe("checkTurboConfig", () => {
  const monorepoDir = "/path/to/monorepo";
  const config = makeMockConfig();

  it("should return ok result with successful validation when turbo.json exists and turbo dependency is present", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(ok(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync([
        {
          name: "turbo" as DependencyName,
          version: "^2.5.2",
        },
      ]),
    );

    const result = await checkTurboConfig(monorepoDir)(deps, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Turbo Configuration",
        isValid: true,
        successMessage:
          "Turbo configuration is present in the monorepo root and turbo dependency is installed",
      }),
    );
  });

  it("should return ok result with failed validation when turbo.json exists but turbo dependency is missing", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(ok(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync([
        {
          name: "eslint" as DependencyName,
          version: "^8.0.0",
        },
      ]),
    );

    const result = await checkTurboConfig(monorepoDir)(deps, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Turbo Configuration",
        errorMessage:
          "Turbo dependency not found in devDependencies. Please add 'turbo' to your devDependencies.",
        isValid: false,
      }),
    );
  });

  it("should return ok result with failed validation when turbo.json does not exist", async () => {
    const deps = makeMockDependencies();

    const errorMessage =
      "turbo.json not found in repository root. Make sure to have Turbo configured for the monorepo.";
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(
      err(new Error(errorMessage)),
    );

    const result = await checkTurboConfig(monorepoDir)(deps, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Turbo Configuration",
        errorMessage,
        isValid: false,
      }),
    );
  });

  it("should return the error message when turbo is not listed in devDependencies", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(ok(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync([
        {
          name: "eslint" as DependencyName,
          version: "^8.0.0",
        },
      ]),
    );
    const result = await checkTurboConfig(monorepoDir)(deps, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Turbo Configuration",
        errorMessage:
          "Turbo dependency not found in devDependencies. Please add 'turbo' to your devDependencies.",
        isValid: false,
      }),
    );
  });

  it("should return the error message when turbo version is less than minimum", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(ok(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync([
        {
          name: "turbo" as DependencyName,
          version: "1.0.0",
        },
      ]),
    );
    const result = await checkTurboConfig(monorepoDir)(deps, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Turbo Configuration",
        errorMessage: `Turbo version (1.0.0) is too low. Minimum required version is ${config.minVersions.turbo}.`,
        isValid: false,
      }),
    );
  });

  it("should return the success message when turbo version is ok", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(ok(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync([
        {
          name: "turbo" as DependencyName,
          version: config.minVersions.turbo,
        },
      ]),
    );
    const result = await checkTurboConfig(monorepoDir)(deps, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Turbo Configuration",
        isValid: true,
        successMessage:
          "Turbo configuration is present in the monorepo root and turbo dependency is installed",
      }),
    );
  });
});

describe("checkWorkspaces", () => {
  const monorepoDir = "/path/to/monorepo";
  const validWorkspaces = [
    workspaceSchema.parse({
      name: "workspace1",
      path: "/path/to/workspace1",
    }),
    workspaceSchema.parse({
      name: "workspace2",
      path: "/path/to/workspace2",
    }),
  ];

  it("should return the list of workspaces", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      ok(validWorkspaces),
    );

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        isValid: true,
        successMessage: "Found 2 workspaces",
      }),
    );
  });

  it("should return error when getWorkspaces fails", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      err(new Error("Failed to get workspaces")),
    );

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        errorMessage:
          "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
        isValid: false,
      }),
    );
  });

  it("should return success when workspaces are found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      ok([validWorkspaces[0]]),
    );

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        isValid: true,
        successMessage: "Found 1 workspace",
      }),
    );
  });

  it("should return error when no workspace configuration is found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(ok([]));

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result).toStrictEqual(
      ok({
        checkName: "Workspaces",
        errorMessage:
          "No workspace configuration found. Make sure to configure workspaces in pnpm-workspace.yaml.",
        isValid: false,
      }),
    );
  });
});
