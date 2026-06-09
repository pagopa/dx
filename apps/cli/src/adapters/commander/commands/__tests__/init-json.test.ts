/**
 * Tests for init command JSON output contract.
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

const mocks = vi.hoisted(() => ({
  collectMonorepoPayload: vi.fn(),
  getPlopInstance: vi.fn(),
  runMonorepoActions: vi.fn(),
  tf$: vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
    void args;
    return { stdout: '{"user":{"name":"test@example.com"}}' };
  }),
}));

vi.mock("inquirer");
vi.mock("../../../plop/index.js", () => ({
  collectMonorepoPayload: mocks.collectMonorepoPayload,
  getPlopInstance: mocks.getPlopInstance,
  runMonorepoActions: mocks.runMonorepoActions,
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));

import { makeInitCommand } from "../init.js";

const makePayload = (
  overrides: Partial<MonorepoPayload> = {},
): MonorepoPayload => ({
  repoDescription: "A test repo",
  repoName: "test-repo",
  repoOwner: "pagopa",
  ...overrides,
});

const captureStdout = () => {
  const written: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((data: unknown) => {
    written.push(String(data));
    return true;
  });
  return { written };
};

const captureStderr = () => {
  const written: string[] = [];
  vi.spyOn(process.stderr, "write").mockImplementation((data: unknown) => {
    written.push(String(data));
    return true;
  });
  return { written };
};

const parseNdjson = (written: string[]) =>
  written
    .join("")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

describe("init command json output", () => {
  const payload = makePayload();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inquirer.prompt).mockResolvedValue({ confirm: false });
    mocks.getPlopInstance.mockResolvedValue({});
    mocks.collectMonorepoPayload.mockResolvedValue({ generator: {}, payload });
    mocks.runMonorepoActions.mockResolvedValue(payload);
    vi.spyOn(process, "chdir").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits progress events and final result through the real json presenter", async () => {
    const stdout = captureStdout();
    const stderr = captureStderr();
    const requireGitHubAuth: GitHubAuthFactory = () =>
      okAsync({
        authorizationService: mockDeep<AuthorizationService>(),
        gitHubService: mockDeep<GitHubService>(),
      });
    const program = new Command()
      .option("--output <mode>", "Output mode", "json")
      .addCommand(makeInitCommand(requireGitHubAuth));
    await program.parseAsync(["node", "dx", "--output", "json", "init"]);

    expect(parseNdjson(stderr.written)).toEqual([
      {
        name: "Checking Terraform installation...",
        status: "start",
        type: "step",
      },
      {
        name: "Checking Terraform installation...",
        status: "success",
        type: "step",
      },
      {
        name: "Checking Corepack installation...",
        status: "start",
        type: "step",
      },
      {
        name: "Checking Corepack installation...",
        status: "success",
        type: "step",
      },
      {
        name: "Initializing workspace generator...",
        status: "start",
        type: "step",
      },
      {
        name: "Initializing workspace generator...",
        status: "success",
        type: "step",
      },
      {
        name: "Scaffolding workspace...",
        status: "start",
        type: "step",
      },
      {
        name: "Scaffolding workspace...",
        status: "success",
        type: "step",
      },
    ]);
    expect(parseNdjson(stdout.written)).toEqual([
      {
        data: {
          gitHubRepoCreationSkipped: true,
          payload,
        },
        ok: true,
      },
    ]);
  });
});
