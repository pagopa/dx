import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkTurboConfig } from "../package-json.js";
import { checkPreCommitConfig } from "../repository.js";
import { makeMockDependencies } from "./data.js";

describe("checkPreCommitConfig", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should return ok result with successful validation when .pre-commit-config.yaml exists", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsPreCommitConfig.mockReturnValueOnce(ok(true));

    const result = await checkPreCommitConfig(monorepoDir)(deps);

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
      err(new Error(errorMessage)),
    );

    const result = await checkPreCommitConfig(monorepoDir)(deps);

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

  it("should return ok result with successful validation when turbo.json exists", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(ok(true));

    const result = await checkTurboConfig(monorepoDir)(deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.checkName).toBe("Turbo Configuration");
      if (validation.isValid) {
        expect(validation.successMessage).toBe(
          "Turbo configuration is present in the monorepo root",
        );
      }
    }
  });

  it("should return ok result with failed validation when turbo.json does not exist", async () => {
    const deps = makeMockDependencies();

    const errorMessage =
      "turbo.json not found in repository root. Make sure to have Turbo configured for the monorepo.";
    deps.repositoryReader.existsTurboConfig.mockReturnValueOnce(
      err(new Error(errorMessage)),
    );

    const result = await checkTurboConfig(monorepoDir)(deps);

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
});
