/**
 * Tests for the `doctor` Commander command.
 *
 * Verifies that the doctor outcome is routed through the shared
 * CommandPresenter port: JSON mode emits the structured envelope while text
 * mode emits a human-readable per-check summary. The exit code reflects whether
 * any check failed.
 */

import { Command } from "commander";
import { errAsync, okAsync } from "neverthrow";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  Dependencies,
  GitHubAuthFactory,
} from "../../../../domain/dependencies.js";
import type { DoctorResult } from "../../../../domain/doctor.js";
import type { PackageJsonReader } from "../../../../domain/package-json.js";
import type { RepositoryReader } from "../../../../domain/repository.js";

import { getConfig } from "../../../../config.js";
import { runDoctor } from "../../../../domain/doctor.js";
import { makeDoctorCommand } from "../doctor.js";

vi.mock("../../../../domain/doctor.js", () => ({
  runDoctor: vi.fn(),
}));

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

const captureStdout = (): string[] => {
  const stdout: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
    stdout.push(String(data));
    return true;
  });
  return stdout;
};

const runDoctorCommand = async (output: "json" | "text") => {
  const command = makeDoctorCommand(makeDependencies(), getConfig());
  const program = new Command()
    .exitOverride()
    .option("--output <mode>", "Output mode", output)
    .addCommand(command);

  await program.parseAsync(["node", "dx", "--output", output, "doctor"]);
};

describe("makeDoctorCommand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("reports the structured result through the json command presenter", async () => {
    const result: DoctorResult = {
      checks: [
        { checkName: "Nx configuration", isValid: true, successMessage: "ok" },
      ],
      hasErrors: false,
    };
    vi.mocked(runDoctor).mockResolvedValue(result);
    const stdout = captureStdout();

    await runDoctorCommand("json");

    expect(JSON.parse(stdout.join(""))).toStrictEqual({
      data: result,
      ok: true,
    });
    expect(process.exitCode).toBe(0);
  });

  it("keeps the structured envelope and exits non-zero when checks fail in json mode", async () => {
    const result: DoctorResult = {
      checks: [
        {
          checkName: "Workspaces",
          errorMessage: "Workspaces are misconfigured",
          isValid: false,
        },
      ],
      hasErrors: true,
    };
    vi.mocked(runDoctor).mockResolvedValue(result);
    const stdout = captureStdout();

    await runDoctorCommand("json");

    // The full structured breakdown is preserved even on failure.
    expect(JSON.parse(stdout.join(""))).toStrictEqual({
      data: result,
      ok: true,
    });
    expect(process.exitCode).toBe(1);
  });

  it("renders a per-check summary through the presenter in text mode", async () => {
    const result: DoctorResult = {
      checks: [
        {
          checkName: "Nx configuration",
          isValid: true,
          successMessage: "Nx is configured",
        },
        {
          checkName: "Workspaces",
          errorMessage: "Workspaces are misconfigured",
          isValid: false,
        },
      ],
      hasErrors: true,
    };
    vi.mocked(runDoctor).mockResolvedValue(result);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runDoctorCommand("text");

    expect(log).toHaveBeenCalledTimes(1);
    const output = String(log.mock.calls[0]?.[0]);
    expect(output).toContain("✅ Nx is configured");
    expect(output).toContain("❌ Workspaces are misconfigured");
    expect(process.exitCode).toBe(1);
    // Text mode must not emit the JSON result envelope.
    expect(output).not.toContain('"ok"');
  });
});
