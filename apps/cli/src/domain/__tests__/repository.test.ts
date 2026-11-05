import { errAsync, ok, okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";

import { checkNxConfig, checkNxTerraformPlugin } from "../repository.js";
import {
  makeMockConfig,
  makeMockDependencies,
  makeMockRepositoryRoot,
} from "./data.js";

describe("checkNxTerraformPlugin", () => {
  const repositoryRoot = makeMockRepositoryRoot();

  it("should return ok result with successful validation when nx.json configures the plugin", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(
      okAsync(
        JSON.stringify({
          plugins: [
            { plugin: "@nx/js/typescript" },
            { plugin: "@pagopa/nx-terraform" },
          ],
        }),
      ),
    );

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        isValid: true,
        successMessage: "@pagopa/nx-terraform is configured in nx.json",
      }),
    );
    expect(deps.repositoryReader.readFile).toHaveBeenCalledWith(
      "a/repo/root/nx.json",
    );
  });

  it("should accept the plugin configured in the shorthand string form", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(
      okAsync(
        JSON.stringify({
          plugins: ["@nx/js/typescript", "@pagopa/nx-terraform"],
        }),
      ),
    );

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        isValid: true,
        successMessage: "@pagopa/nx-terraform is configured in nx.json",
      }),
    );
  });

  it("should return ok result with failed validation when the plugin is not configured", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(
      okAsync(JSON.stringify({ plugins: [{ plugin: "@nx/js/typescript" }] })),
    );

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        errorMessage:
          "The @pagopa/nx-terraform plugin is not configured in nx.json. Add it to align the repository with the DX Terraform validation pipeline.",
        isValid: false,
      }),
    );
  });

  it("should return ok result with failed validation when nx.json cannot be read", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(
      errAsync(new Error("ENOENT: no such file or directory")),
    );

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        errorMessage:
          "Could not read nx.json: ENOENT: no such file or directory. Make sure to have Nx configured for the monorepo.",
        isValid: false,
      }),
    );
  });

  it("should return ok result with failed validation when nx.json is not valid JSON", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(okAsync("not-json"));

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        errorMessage:
          "nx.json is not a valid JSON file (InvalidSymbol at offset 0).",
        isValid: false,
      }),
    );
  });

  it("should accept an nx.json with comments and trailing commas", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(
      okAsync(
        [
          "{",
          "  // DX Nx Terraform plugin",
          '  "plugins": [{ "plugin": "@pagopa/nx-terraform" },],',
          "}",
          "",
        ].join("\n"),
      ),
    );

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        isValid: true,
        successMessage: "@pagopa/nx-terraform is configured in nx.json",
      }),
    );
  });

  it("should return ok result with failed validation when nx.json has an unexpected shape", async () => {
    const deps = makeMockDependencies();
    deps.repositoryReader.readFile.mockReturnValueOnce(
      okAsync('{ "plugins": {} }'),
    );

    const result = await checkNxTerraformPlugin(deps, repositoryRoot);

    expect(result).toStrictEqual(
      ok({
        checkName: "Nx Terraform Plugin",
        errorMessage:
          "nx.json has an unexpected shape (plugins: Invalid input: expected array, received object).",
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
