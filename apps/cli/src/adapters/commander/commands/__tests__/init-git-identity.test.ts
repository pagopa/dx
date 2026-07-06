/**
 * Tests the git identity fallback used by the init command when the local git
 * configuration does not define user.name or user.email.
 */

import { Command } from "commander";
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
    collectMonorepoPayload: vi.fn(),
    createCommandPresenter: vi.fn(() => presenter),
    execa$: vi.fn(),
    getPlopInstance: vi.fn(),
    reportError,
    reportResult,
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

describe("makeInitCommand git identity fallback", () => {
  let executedGitCommands: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    executedGitCommands = [];

    const payload = makePayload();
    const repositoryTerraform = vi.fn(() =>
      Promise.resolve({ exitCode: 0, stderr: "", stdout: "" }),
    );
    const gitCommands = vi.fn(
      (strings: TemplateStringsArray, ...values: string[]) => {
        const command = strings.reduce(
          (acc, chunk, index) => acc + chunk + (values[index] ?? ""),
          "",
        );
        executedGitCommands.push(command);

        if (command === "git config --get user.name") {
          return Promise.resolve({ exitCode: 1, stderr: "", stdout: "" });
        }

        if (command === "git config --get user.email") {
          return Promise.resolve({ exitCode: 1, stderr: "", stdout: "" });
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
        : repositoryTerraform,
    );
    mocks.execa$.mockImplementation((options?: { shell?: boolean }) =>
      options?.shell === true ? gitCommands : Promise.resolve({ stdout: "" }),
    );
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: true });
    vi.spyOn(process, "chdir").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
