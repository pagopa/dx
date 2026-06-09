/**
 * Tests for confirmGitHubRepoCreation in the init command.
 */

import { Command } from "commander";
import inquirer from "inquirer";
import { okAsync } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";
import type { Payload as MonorepoPayload } from "../../../plop/generators/monorepo/index.js";

const mocks = vi.hoisted(() => {
  const presenter = {
    reportError: vi.fn(),
    reportResult: vi.fn(),
    trackStep: vi.fn(async (_name: string, task: () => Promise<unknown>) =>
      task(),
    ),
  };

  return {
    collectMonorepoPayload: vi.fn(),
    createCommandPresenter: vi.fn(() => presenter),
    getPlopInstance: vi.fn(),
    presenter,
    runMonorepoActions: vi.fn(),
    tf$: vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
      void args;
      return { stdout: '{"user":{"name":"test@example.com"}}' };
    }),
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
}));

import { confirmGitHubRepoCreation, makeInitCommand } from "../init.js";

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
  const initCommand = makeInitCommand(requireGitHubAuth);
  initCommand.exitOverride().configureOutput(silentOutput);

  const program = new Command();
  program
    .exitOverride()
    .option("--output <mode>", "Output mode", output)
    .addCommand(initCommand);

  await program.parseAsync(["node", "dx", "--output", output, "init"]);
};

describe("confirmGitHubRepoCreation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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

  it("uses the command presenter to report json progress and results", async () => {
    await runInitCommand("json");

    expect(mocks.createCommandPresenter).toHaveBeenCalledWith("json");
    expect(mocks.presenter.trackStep).toHaveBeenCalledWith(
      "Checking Terraform installation...",
      expect.any(Function),
    );
    expect(mocks.presenter.trackStep).toHaveBeenCalledWith(
      "Checking Corepack installation...",
      expect.any(Function),
    );
    expect(mocks.presenter.reportResult).toHaveBeenCalledWith(
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

    expect(mocks.presenter.reportError).toHaveBeenCalledWith(
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
    expect(mocks.presenter.reportError).not.toHaveBeenCalled();
  });
});
