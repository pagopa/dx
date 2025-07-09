import { errAsync, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkPreCommitConfig, checkTurboConfig } from "../repository.js";
import { checkWorkspaces } from "../workspace.js";
import { workspaceSchema } from "../workspace.js";
import { makeMockConfig, makeMockDependencies } from "./data.js";

describe("checkPreCommitConfig", () => {
  it("should return ok result with successful validation when .pre-commit-config.yaml exists", async () => {
    const deps = makeMockDependencies();
    const config = makeMockConfig();
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));

    const result = await checkPreCommitConfig(deps, config);

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
    expect(deps.repositoryReader.fileExists).toHaveBeenCalledWith(
      "a/repo/root/.pre-commit-config.yaml",
    );
  });

  it("should return ok result with failed validation when .pre-commit-config.yaml does not exist", async () => {
    const deps = makeMockDependencies();
    const config = makeMockConfig();

    const errorMessage =
      ".pre-commit-config.yaml not found in repository root. Make sure to have pre-commit configured for the repository.";
    deps.repositoryReader.fileExists.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkPreCommitConfig(deps, config);

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
  const config = makeMockConfig();

  it("should return ok result with successful validation when turbo.json exists and turbo dependency is present", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("turbo", "^2.5.2")),
    );

    const result = await checkTurboConfig(deps, config);

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
    expect(deps.repositoryReader.fileExists).toHaveBeenCalledWith(
      "a/repo/root/turbo.json",
    );
  });

  it("should return ok result with failed validation when turbo.json exists but turbo dependency is missing", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("eslint", "^8.0.0")),
    );

    const result = await checkTurboConfig(deps, config);

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
    deps.repositoryReader.fileExists.mockReturnValueOnce(
      errAsync(new Error(errorMessage)),
    );

    const result = await checkTurboConfig(deps, config);

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
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("eslint", "^8.0.0")),
    );
    const result = await checkTurboConfig(deps, config);
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
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("turbo", "1.0.0")),
    );
    const result = await checkTurboConfig(deps, config);
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
    deps.repositoryReader.fileExists.mockReturnValueOnce(okAsync(true));
    deps.packageJsonReader.getDependencies.mockReturnValueOnce(
      okAsync(new Map().set("turbo", config.minVersions.turbo)),
    );
    const result = await checkTurboConfig(deps, config);
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

describe("checkWorkspaces", () => {
  const monorepoDir = "/path/to/monorepo";

  it("should return the list of workspaces, without counting the root workspace", async () => {
    const deps = makeMockDependencies();

    const workspaces = [
      workspaceSchema.parse({
        name: "root",
        path: "/path/to/monorepo",
      }),
      workspaceSchema.parse({
        name: "workspace1",
        path: "/path/to/workspace1",
      }),
      workspaceSchema.parse({
        name: "workspace2",
        path: "/path/to/workspace2",
      }),
    ];

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(ok(workspaces));

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(true);
      expect(validation.checkName).toBe("Workspaces");
      if (validation.isValid) {
        expect(validation.successMessage).toBe(
          "Found 2 workspaces in the repository",
        );
      }
    }
  });

  it("should return the error message when no workspaces are found", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      ok([
        workspaceSchema.parse({
          name: "root",
          path: "/path/to/monorepo",
        }),
      ]),
    );

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Workspaces");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(
          "No workspaces found in the repository. Make sure to have at least one workspace configured.",
        );
      }
    }
  });

  it("should return error when getWorkspaces fails", async () => {
    const deps = makeMockDependencies();

    deps.repositoryReader.getWorkspaces.mockResolvedValueOnce(
      err(new Error("Failed to get workspaces")),
    );

    const result = await checkWorkspaces(monorepoDir)(deps);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const validation = result.value;
      expect(validation.isValid).toBe(false);
      expect(validation.checkName).toBe("Workspaces");
      if (!validation.isValid) {
        expect(validation.errorMessage).toBe(
          "Something is wrong with the workspaces configuration. If you need help, please contact the DevEx team.",
        );
      }
    }
  });
});
