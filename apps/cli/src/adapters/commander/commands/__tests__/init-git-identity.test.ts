/**
 * Tests git setup behavior used by the init command.
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

import { PullRequest } from "../../../../domain/github.js";

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
    assertGitHubPackagesAccess: vi.fn(),
    collectMonorepoPayload: vi.fn(),
    createCommandPresenter: vi.fn(() => presenter),
    execa$: vi.fn(),
    fetch: vi.fn<typeof fetch>(),
    getPlopInstance: vi.fn(),
    reportError,
    reportResult,
    repositoryTerraform: vi.fn(),
    resolveOutputMode: vi.fn(
      (_env: unknown, output: "json" | "text" | undefined) => output ?? "text",
    ),
    runMonorepoActions: vi.fn(),
    tf$: vi.fn(),
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
vi.mock("../../../github/packages.js", () => ({
  assertGitHubPackagesAccess: mocks.assertGitHubPackagesAccess,
}));
vi.mock("../../presenters/index.js", () => ({
  createCommandPresenter: mocks.createCommandPresenter,
  resolveOutputMode: mocks.resolveOutputMode,
}));
vi.mock("execa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("execa")>();

  return {
    ...actual,
    $: mocks.execa$,
  };
});

import { makeInitCommand } from "../init.js";

const silentOutput = {
  writeErr: () => {
    /* silence stderr in tests */
  },
  writeOut: () => {
    /* silence stdout in tests */
  },
};

const makePayload = (
  overrides: Partial<MonorepoPayload> = {},
): MonorepoPayload => ({
  repoDescription: "A test repo",
  repoName: "test-repo",
  repoOwner: "pagopa",
  ...overrides,
});

const makeGitFailure = (command: string, stderr: string): ExecaError => {
  const error = new ExecaError();
  error.exitCode = 1;
  error.shortMessage = `Command failed with exit code 1: ${command}`;
  error.stderr = stderr;
  return error;
};

const runInitCommand = async () => {
  const gitHubService = mockDeep<GitHubService>();
  gitHubService.createPullRequest.mockResolvedValue(
    new PullRequest("https://github.com/pagopa/test-repo/pull/1"),
  );

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
    .option("--output <mode>", "Output mode", "json")
    .addCommand(initCommand);

  await program.parseAsync(["node", "dx", "--output", "json", "init"]);
};

describe("makeInitCommand git setup", () => {
  let executedGitCommands: string[];
  let gitConfigValues: Record<"user.email" | "user.name", string | undefined>;
  let pushFailure: ExecaError | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    executedGitCommands = [];
    pushFailure = undefined;
    gitConfigValues = {
      "user.email": undefined,
      "user.name": undefined,
    };

    const payload = makePayload();
    mocks.repositoryTerraform.mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "",
    });
    mocks.fetch.mockResolvedValue(
      new Response(null, {
        headers: { "X-OAuth-Scopes": "repo, workflow" },
      }),
    );
    vi.stubGlobal("fetch", mocks.fetch);
    const gitCommands = vi.fn(
      (strings: TemplateStringsArray, ...values: string[]) => {
        const command = strings.reduce(
          (acc, chunk, index) => acc + chunk + (values[index] ?? ""),
          "",
        );
        executedGitCommands.push(command);

        if (command === "git remote get-url --push origin") {
          return Promise.resolve({
            exitCode: 0,
            stderr: "",
            stdout: "https://github.com/pagopa/test-repo.git",
          });
        }

        if (command.startsWith("git config --get-urlmatch http.extraHeader ")) {
          return Promise.resolve({ exitCode: 1, stderr: "", stdout: "" });
        }

        if (command === "git credential fill") {
          return Promise.resolve({
            exitCode: 0,
            stderr: "",
            stdout: "username=test-user\npassword=git-test-token\n",
          });
        }

        if (command === "git config --get user.name") {
          return Promise.resolve(
            gitConfigValues["user.name"] === undefined
              ? { exitCode: 1, stderr: "", stdout: "" }
              : {
                  exitCode: 0,
                  stderr: "",
                  stdout: gitConfigValues["user.name"],
                },
          );
        }

        if (command === "git config --get user.email") {
          return Promise.resolve(
            gitConfigValues["user.email"] === undefined
              ? { exitCode: 1, stderr: "", stdout: "" }
              : {
                  exitCode: 0,
                  stderr: "",
                  stdout: gitConfigValues["user.email"],
                },
          );
        }

        if (
          command === "git push -u origin features/scaffold-workspace" &&
          pushFailure
        ) {
          return Promise.reject(pushFailure);
        }

        return Promise.resolve({ exitCode: 0, stderr: "", stdout: "" });
      },
    );

    mocks.getPlopInstance.mockResolvedValue({});
    mocks.collectMonorepoPayload.mockResolvedValue({ generator: {}, payload });
    mocks.runMonorepoActions.mockResolvedValue(payload);
    mocks.tf$.mockImplementation((...args: unknown[]) =>
      Array.isArray(args[0])
        ? Promise.resolve({ stdout: "ok" })
        : mocks.repositoryTerraform,
    );
    mocks.execa$.mockImplementation((options?: { shell?: boolean }) =>
      options?.shell !== undefined
        ? gitCommands
        : // The generated Terraform projects are initialized through Nx.
          () => Promise.resolve({ stdout: "" }),
    );
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });
    vi.spyOn(process, "chdir").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.exitCode = undefined;
  });

  it("uses temporary git -c identity overrides when git user config is missing", async () => {
    await runInitCommand();

    const commitCommand = executedGitCommands.find((command) =>
      command.includes('commit --no-gpg-sign -m "Scaffold workspace"'),
    );

    expect(commitCommand).toContain(
      'git -c user.name=dx-pagopa-bot -c user.email=dx-pagopa-github-bot@pagopa.it commit --no-gpg-sign -m "Scaffold workspace"',
    );
  });

  it("uses the default bot identity for both values when only one git config value is present", async () => {
    gitConfigValues["user.name"] = "User Name";

    await runInitCommand();

    const commitCommand = executedGitCommands.find((command) =>
      command.includes('commit --no-gpg-sign -m "Scaffold workspace"'),
    );

    expect(commitCommand).toContain(
      'git -c user.name=dx-pagopa-bot -c user.email=dx-pagopa-github-bot@pagopa.it commit --no-gpg-sign -m "Scaffold workspace"',
    );
  });

  it("checks Git's workflow scope before creating the remote repository", async () => {
    await runInitCommand();

    expect(mocks.fetch).toHaveBeenCalledBefore(mocks.repositoryTerraform);
    expect(mocks.reportError).not.toHaveBeenCalled();
    expect(mocks.reportResult).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: expect.objectContaining({
          name: "test-repo",
          owner: "pagopa",
        }),
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it("stops a missing workflow scope before Terraform creates a repository or Git pushes", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(null, {
        headers: { "X-OAuth-Scopes": "repo" },
      }),
    );

    await runInitCommand();

    expect(mocks.repositoryTerraform).not.toHaveBeenCalled();
    expect(executedGitCommands).not.toContain("git fetch origin main");
    expect(executedGitCommands).not.toContain(
      "git push -u origin features/scaffold-workspace",
    );
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("workflow"),
      }),
    );
    expect(mocks.reportResult).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it("does not switch credentials or retry when GitHub rejects the push", async () => {
    pushFailure = makeGitFailure(
      "git push -u origin features/scaffold-workspace",
      "remote rejected: refusing to allow an OAuth App to create or update workflow `.github/workflows/validate.yaml` without `workflow` scope",
    );

    await runInitCommand();

    expect(
      executedGitCommands.filter((command) => command.includes(" push ")),
    ).toEqual(["git push -u origin features/scaffold-workspace"]);
    expect(mocks.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        cause: pushFailure,
        message: "Failed to push code to GitHub.",
      }),
    );
  });
});
