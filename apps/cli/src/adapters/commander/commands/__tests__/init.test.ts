/**
 * Tests for confirmGitHubRepoCreation in the init command.
 */

import { Command } from "commander";
import { ExecaError } from "execa";
import inquirer from "inquirer";
import { okAsync } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { CommandPresenter } from "../../../../domain/command-presenter.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";
import type { Payload as MonorepoPayload } from "../../../plop/generators/monorepo/index.js";

const mocks = vi.hoisted(() => {
  const reportError = vi.fn();
  const reportResult = vi.fn();
  const trackStepMock = vi.fn();
  const presenter: CommandPresenter = {
    reportError,
    reportResult,
    trackStep: async <T>(name: string, task: () => Promise<T>) => {
      trackStepMock(name, task);
      return task();
    },
  };

  return {
    collectMonorepoPayload: vi.fn(),
    createCommandPresenter: vi.fn(() => presenter),
    getPlopInstance: vi.fn(),
    presenter,
    reportError,
    reportResult,
    resolveOutputMode: vi.fn(
      (_env: unknown, output: "json" | "text" | undefined) => output ?? "text",
    ),
    runMonorepoActions: vi.fn(),
    tf$: vi.fn((...args: unknown[]): unknown => {
      void args;
      return Promise.resolve({
        stdout: '{"user":{"name":"test@example.com"}}',
      });
    }),
    trackStepMock,
  };
});

vi.mock("inquirer");
vi.mock("ora", () => ({
  oraPromise: <T>(promise: Promise<T>) => promise,
}));
vi.mock("../../../plop/index.js", () => ({
  collectMonorepoPayload: mocks.collectMonorepoPayload,
  getPlopInstance: mocks.getPlopInstance,
  runMonorepoActions: mocks.runMonorepoActions,
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));
vi.mock("../../presenters/index.js", () => ({
  createCommandPresenter: mocks.createCommandPresenter,
  resolveOutputMode: mocks.resolveOutputMode,
}));

import {
  confirmGitHubRepoCreation,
  getMonorepoInitialAnswers,
  makeInitCommand,
  mapGitRemoteAddError,
  parseInitCommandOptions,
} from "../init.js";

const makePayload = (
  overrides: Partial<MonorepoPayload> = {},
): MonorepoPayload => ({
  repoDescription: "A test repo",
  repoName: "test-repo",
  repoOwner: "pagopa",
  ...overrides,
});

const silentOutput = {
  writeErr: () => {
    /* silence stderr in tests */
  },
  writeOut: () => {
    /* silence stdout in tests */
  },
};

const runInitCommand = async (
  output: "json" | "text" = "json",
  gitHubService: GitHubService = mockDeep<GitHubService>(),
) => {
  const requireGitHubAuth: GitHubAuthFactory = () =>
    okAsync({
      authorizationService: mockDeep<AuthorizationService>(),
      gitHubService,
    });
  const initCommand = makeInitCommand(requireGitHubAuth, { CI: false });
  initCommand.exitOverride().configureOutput(silentOutput);

  const program = new Command();
  program
    .exitOverride()
    .option("--output <mode>", "Output mode", output)
    .addCommand(initCommand);

  await program.parseAsync(["node", "dx", "--output", output, "init"]);
};

const makeExecaError = ({
  exitCode = 1,
  shortMessage,
  stderr = "",
}: {
  exitCode?: number;
  shortMessage: string;
  stderr?: string;
}): ExecaError => {
  const error = new ExecaError();
  error.exitCode = exitCode;
  error.shortMessage = shortMessage;
  error.stderr = stderr;
  return error;
};

const getErrorMessage = (value: unknown): string =>
  value instanceof Error ? value.message : "";

describe("confirmGitHubRepoCreation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the provided publish choice without prompting again", async () => {
    const result = await confirmGitHubRepoCreation(makePayload(), false);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(false);
    expect(inquirer.prompt).not.toHaveBeenCalled();
  });

  it("returns true when the user confirms", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

    const result = await confirmGitHubRepoCreation(makePayload());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(true);
  });

  it("returns false when the user declines", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });

    const result = await confirmGitHubRepoCreation(makePayload());

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(false);
  });

  it("prompts with the correct repository name and owner", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });

    const payload = makePayload({ repoName: "my-repo", repoOwner: "my-org" });
    await confirmGitHubRepoCreation(payload);

    expect(inquirer.prompt).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("my-org/my-repo"),
        type: "confirm",
      }),
    );
  });

  it("returns an error result when the prompt rejects", async () => {
    const cause = new Error("non-interactive TTY");
    vi.mocked(inquirer.prompt).mockRejectedValue(cause);

    const result = await confirmGitHubRepoCreation(makePayload());

    expect(result.isErr()).toBe(true);
    const err = result._unsafeUnwrapErr();
    expect(err).toBeInstanceOf(Error);
    expect(err.cause).toBe(cause);
  });
});

describe("parseInitCommandOptions", () => {
  it("returns the provided init flags", () => {
    expect(
      parseInitCommandOptions({
        description: "My DX workspace",
        name: "my-dx-workspace",
        owner: "pagopa",
        publish: true,
      }),
    ).toEqual({
      description: "My DX workspace",
      name: "my-dx-workspace",
      owner: "pagopa",
      publish: true,
    });
  });

  it("formats blank string validation errors with zod context", () => {
    expect(() =>
      parseInitCommandOptions({
        name: "   ",
      }),
    ).toThrow(/name/);
  });
});

describe("getMonorepoInitialAnswers", () => {
  it("maps init CLI options to the monorepo payload keys", () => {
    expect(
      getMonorepoInitialAnswers({
        description: "My DX workspace",
        name: "my-dx-workspace",
        owner: "pagopa",
        publish: true,
      }),
    ).toEqual({
      publishToGitHub: true,
      repoDescription: "My DX workspace",
      repoName: "my-dx-workspace",
      repoOwner: "pagopa",
    });
  });
});

describe("mapGitRemoteAddError", () => {
  it("explains how to recover when the 'origin' remote already exists (exit code 3)", () => {
    const cause = makeExecaError({
      exitCode: 3,
      shortMessage: "Command failed: git remote add origin",
    });

    const error = mapGitRemoteAddError(cause);

    expect(error.message).toContain("already exists");
    expect(error.message).toContain("git remote remove origin");
    expect(error.cause).toBe(cause);
  });

  it("falls back to the remote-setup message for other git exit codes", () => {
    const cause = makeExecaError({
      exitCode: 1,
      shortMessage: "Command failed: git remote add origin",
    });

    const error = mapGitRemoteAddError(cause);

    expect(error.message).toBe(
      "Failed to set up the local git repository and its 'origin' remote.",
    );
    expect(error.cause).toBe(cause);
  });

  it("falls back to the remote-setup message for non-Execa errors", () => {
    const cause = new Error("spawn git ENOENT");

    const error = mapGitRemoteAddError(cause);

    expect(error.message).toBe(
      "Failed to set up the local git repository and its 'origin' remote.",
    );
    expect(error.cause).toBe(cause);
  });
});

describe("makeInitCommand", () => {
  const payload = makePayload();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });
    mocks.getPlopInstance.mockResolvedValue({});
    mocks.collectMonorepoPayload.mockResolvedValue({ generator: {}, payload });
    mocks.runMonorepoActions.mockResolvedValue(payload);
    vi.spyOn(process, "chdir").mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("registers flags for every init input", () => {
    const requireGitHubAuth: GitHubAuthFactory = () =>
      okAsync({
        authorizationService: mockDeep<AuthorizationService>(),
        gitHubService: mockDeep<GitHubService>(),
      });
    const command = makeInitCommand(requireGitHubAuth, { CI: false });

    const flags = command.options.flatMap((option) => [
      option.flags,
      option.long,
    ]);

    expect(flags).toEqual(
      expect.arrayContaining([
        "--name <name>",
        "--owner <owner>",
        "--description <description>",
        "--publish",
      ]),
    );
  });

  it("uses the command presenter to report json progress and results", async () => {
    await runInitCommand("json");

    expect(mocks.trackStepMock).toHaveBeenCalledWith(
      "Checking Terraform installation...",
      expect.any(Function),
    );
    expect(mocks.trackStepMock).toHaveBeenCalledWith(
      "Checking Corepack installation...",
      expect.any(Function),
    );
    expect(mocks.reportResult).toHaveBeenCalledWith(
      expect.objectContaining({
        gitHubRepoCreationSkipped: true,
        payload,
      }),
    );
  });

  it("uses the command presenter to report json errors", async () => {
    const error = new Error("generator failed");
    mocks.runMonorepoActions.mockRejectedValue(error);

    await runInitCommand("json");

    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to run the generator",
      }),
    );
    expect(process.exitCode).toBe(1);
  });

  it("uses Commander error handling for text errors", async () => {
    const error = new Error("generator failed");
    mocks.runMonorepoActions.mockRejectedValue(error);

    await expect(runInitCommand("text")).rejects.toMatchObject({
      code: "commander.error",
      exitCode: 1,
    });
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("reports the terraform apply failure details when GitHub repository creation fails", async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });
    const terraformError = makeExecaError({
      shortMessage:
        "Command failed with exit code 1: terraform apply -auto-approve",
      stderr: "Error: repository already exists",
    });
    const repoTerraform = vi.fn((strings: TemplateStringsArray) =>
      strings.join("").includes("apply")
        ? Promise.reject(terraformError)
        : Promise.resolve({ stdout: "" }),
    );
    mocks.tf$.mockImplementation((...args: unknown[]) =>
      Array.isArray(args[0])
        ? Promise.resolve({ stdout: '{"user":{"name":"test@example.com"}}' })
        : repoTerraform,
    );

    await runInitCommand("json");

    const reportedError = mocks.reportError.mock.lastCall?.[0];
    expect(reportedError).toMatchObject({ cause: terraformError });
    const message = getErrorMessage(reportedError);
    expect(message).toContain(
      "Terraform apply failed while creating the GitHub repository.",
    );
    expect(message).toContain(
      "Command failed with exit code 1: terraform apply -auto-approve",
    );
    expect(message).toContain("Error: repository already exists");
    expect(message).not.toContain("Failed to create GitHub repository.");
  });
});
