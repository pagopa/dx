import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkPreCommitConfig, checkTurboConfig } from "../repository.js";
import { makeMockConfig, makeMockDependencies } from "./data.js";

describe("checkPreCommitConfig", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should return ok result with successful validation when .pre-commit-config.yaml exists", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsPreCommitConfig.mockReturnValueOnce(
      okAsync(true),
    );

    const result = await checkPreCommitConfig(monorepoDir, deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.checkName).toBe("Pre-commit Configuration");
      if (validation.isValid) {
        expect(validation.successMessage).toBe(
          "Pre-commit configuration is present in the repository root",
        );
      }
    }
  });

  it("should return ok result with failed validation when .pre-commit-config.yaml does not exist", async () => {
    const deps = makeMockDependencies();

    const errorMessage =
      ".pre-commit-config.yaml not found in repository root. Make sure to have pre-commit configured for the repository.";
    deps.repositoryReader.existsPreCommitConfig.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkPreCommitConfig(monorepoDir, deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Pre-commit Configuration");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(errorMessage);
      }
    }
  });
});

describe("checkTurboConfig", () => {
  const monorepoDir = "/path/to/monorepo";
  const config = makeMockConfig();

  it("should return ok result with successful validation when turbo.json exists and turbo dependency is present", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("turbo", "^2.5.2")),
    );

    const result = await checkTurboConfig(monorepoDir, deps, config);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (validation.isValid) {
        expect(validation.successMessage).toBe(
          "Turbo configuration is present in the monorepo root and turbo dependency is installed",
        );
      }
    }
  });

  it("should return ok result with failed validation when turbo.json exists but turbo dependency is missing", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("eslint", "^8.0.0")),
    );

    const result = await checkTurboConfig(monorepoDir, deps, config);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(
          "Turbo dependency not found in devDependencies. Please add 'turbo' to your devDependencies.",
        );
      }
    }
  });

  it("should return ok result with failed validation when turbo.json does not exist", async () => {
    const deps = makeMockDependencies();

    const errorMessage =
      "turbo.json not found in repository root. Make sure to have Turbo configured for the monorepo.";
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkTurboConfig(monorepoDir, deps, config);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(errorMessage);
      }
    }
  });

  it("should return the error message when turbo is not listed in devDependencies", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("eslint", "^8.0.0")),
    );
    const result = await checkTurboConfig(monorepoDir, deps, config);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(
          "Turbo dependency not found in devDependencies. Please add 'turbo' to your devDependencies.",
        );
      }
    }
  });

  it("should return the error message when turbo version is less than minimum", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("turbo", "1.0.0")),
    );
    const result = await checkTurboConfig(monorepoDir, deps, config);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(
          `Turbo version (1.0.0) is too low. Minimum required version is ${config.minVersions.turbo}.`,
        );
      }
    }
  });

  it("should return the success message when turbo version is ok", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("turbo", config.minVersions.turbo)),
    );
    const result = await checkTurboConfig(monorepoDir, deps, config);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (validation.isValid) {
        expect(validation.successMessage).toBe(
          "Turbo configuration is present in the monorepo root and turbo dependency is installed",
        );
      }
    }
  });
});
