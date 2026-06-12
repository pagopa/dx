/**
 * Tests for the `info` Commander command.
 *
 * Verifies that command output goes through the shared CommandPresenter port.
 */

import { Command } from "commander";
import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  Dependencies,
  GitHubAuthFactory,
} from "../../../../domain/dependencies.js";
import type { PackageJsonReader } from "../../../../domain/package-json.js";
import type { RepositoryReader } from "../../../../domain/repository.js";
import type { ValidationReporter } from "../../../../domain/validation.js";

import { packageJsonSchema } from "../../../../domain/package-json.js";
import { makeInfoCommand } from "../info.js";

const makeDependencies = (): Dependencies => {
  const packageJson = packageJsonSchema.parse({
    name: "test-package",
    packageManager: "pnpm",
  });

  const packageJsonReader: PackageJsonReader = {
    getDependencies: vi.fn(),
    getRootRequiredScripts: vi.fn(() => new Map()),
    getScripts: vi.fn(),
    readPackageJson: vi.fn(() => okAsync(packageJson)),
  };

  const repositoryReader: RepositoryReader = {
    fileExists: vi.fn(() => okAsync(false)),
    findRepositoryRoot: vi.fn(() => okAsync("a/repo/root")),
    getWorkspaces: vi.fn(),
    readFile: vi
      .fn()
      .mockReturnValueOnce(okAsync("22.0.0\n"))
      .mockReturnValueOnce(okAsync("1.12.0\n")),
  };

  const requireGitHubAuth: GitHubAuthFactory = () =>
    errAsync(new Error("not used by the info command"));

  const validationReporter: ValidationReporter = {
    reportCheckResult: vi.fn(),
  };

  return {
    packageJsonReader,
    repositoryReader,
    requireGitHubAuth,
    validationReporter,
  };
};

const runInfoCommand = async (output: "json" | "text") => {
  const command = makeInfoCommand(makeDependencies());
  const program = new Command()
    .exitOverride()
    .option("--output <mode>", "Output mode", output)
    .addCommand(command);

  await program.parseAsync(["node", "dx", "--output", output, "info"]);
};

describe("makeInfoCommand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("reports the info result through the json command presenter", async () => {
    const stdout: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
      stdout.push(String(data));
      return true;
    });

    await runInfoCommand("json");

    const output = stdout.join("");
    expect(output).not.toBe("");
    expect(JSON.parse(output)).toStrictEqual({
      data: {
        node: "22.0.0",
        packageManager: "pnpm",
        terraform: "1.12.0",
      },
      ok: true,
    });
  });
});
