import { errAsync, ok, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkNxConfig, checkPreCommitConfig } from "../repository.js";
import {
  makeMockConfig,
  makeMockDependencies,
  makeMockRepositoryRoot,
} from "./data.js";

describe("checkPreCommitConfig", () => {
  it("should return ok result with successful validation when .pre-commit-config.yaml exists", async () => {
    const deps = makeMockDependencies();
    const repositoryRoot = makeMockRepositoryRoot();
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));

    const result = await checkPreCommitConfig(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Pre-commit Configuration",
        isValid: true,
        successMessage:
          "Pre-commit configuration is present in the repository root",
      }),
    );
    expect(deps.repositoryReader.fileExists).toHaveBeenCalledWith(
      "a/repo/root/.pre-commit-config.yaml",
    );
  });

  it("should return ok result with failed validation when .pre-commit-config.yaml does not exist", async () => {
    const deps = makeMockDependencies();
    const repositoryRoot = makeMockRepositoryRoot();

    const errorMessage =
      ".pre-commit-config.yaml not found in repository root. Make sure to have pre-commit configured for the repository.";
    deps.repositoryReader.fileExists.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkPreCommitConfig(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Pre-commit Configuration",
        errorMessage,
        isValid: false,
      }),
    );
  });
});

describe("checkNxConfig", () => {
  const config = makeMockConfig();
  const repositoryRoot = makeMockRepositoryRoot();

  it("should return ok result with successful validation when nx.json exists and nx dependency is present", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("nx", "^22.6.1")),
    );

    const result = await checkNxConfig(deps, repositoryRoot, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        isValid: true,
        successMessage:
          "Nx configuration is present in the monorepo root and Nx dependency is installed",
      }),
    );
    expect(deps.repositoryReader.fileExists).toHaveBeenCalledWith(
      "a/repo/root/nx.json",
    );
  });

  it("should return ok result with failed validation when nx.json exists but Nx dependency is missing", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("eslint", "^8.0.0")),
    );

    const result = await checkNxConfig(deps, repositoryRoot, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        errorMessage:
          "Nx dependency not found in devDependencies. Please add 'nx' to your devDependencies.",
        isValid: false,
      }),
    );
  });

  it("should return ok result with failed validation when nx.json does not exist", async () => {
    const deps = makeMockDependencies();

    const errorMessage =
      "nx.json not found in repository root. Make sure to have Nx configured for the monorepo.";
    deps.repositoryReader.fileExists.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkNxConfig(deps, repositoryRoot, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        errorMessage,
        isValid: false,
      }),
    );
  });

  it("should return ok result with failed validation when fileExists returns ok(false)", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(false));

    const result = await checkNxConfig(deps, repositoryRoot, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        errorMessage:
          "nx.json not found in repository root. Make sure to have Nx configured for the monorepo.",
        isValid: false,
      }),
    );
  });

  it("should return the error message when nx is not listed in devDependencies", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("eslint", "^8.0.0")),
    );
    const result = await checkNxConfig(deps, repositoryRoot, config);
    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        errorMessage:
          "Nx dependency not found in devDependencies. Please add 'nx' to your devDependencies.",
        isValid: false,
      }),
    );
  });

  it("should return the error message when nx version is less than minimum", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("nx", "1.0.0")),
    );
    const result = await checkNxConfig(deps, repositoryRoot, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        errorMessage: `Nx version (1.0.0) is too low. Minimum required version is ${config.minVersions.nx}.`,
        isValid: false,
      }),
    );
  });

  it("should return the success message when nx version is ok", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("nx", config.minVersions.nx)),
    );
    const result = await checkNxConfig(deps, repositoryRoot, config);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Configuration",
        isValid: true,
        successMessage:
          "Nx configuration is present in the monorepo root and Nx dependency is installed",
      }),
    );
  });
});
