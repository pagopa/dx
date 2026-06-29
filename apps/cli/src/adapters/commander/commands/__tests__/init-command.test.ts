/**
 * Tests for the init Commander command workflow.
 */

import { Command } from "commander";
import { ExecaError } from "execa";
import { okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";
import type { Payload as MonorepoPayload } from "../../../plop/generators/monorepo/index.js";

const { collectMonorepoPayload, getPlopInstance, runMonorepoActions, tfMock } =
  vi.hoisted(() => ({
    collectMonorepoPayload: vi.fn(),
    getPlopInstance: vi.fn(),
    runMonorepoActions: vi.fn(),
    tfMock: vi.fn(),
  }));

vi.mock("ora", () => ({
  oraPromise: <T>(promise: Promise<T>) => promise,
}));

vi.mock("../../../execa/terraform.js", () => ({
  tf$: tfMock,
}));
vi.mock("../../../plop/index.js", () => ({
  collectMonorepoPayload,
  getPlopInstance,
  runMonorepoActions,
}));

import { makeInitCommand } from "../init.js";

const makePayload = (
  overrides: Partial<MonorepoPayload> = {},
): MonorepoPayload => ({
  repoDescription: "A test repo",
  repoName: "test-repo",
  repoOwner: "pagopa",
  ...overrides,
});

const makeRoot = (command: Command, outputMessages: string[] = []) => {
  const output = {
    writeErr: (message: string) => {
      outputMessages.push(message);
    },
    writeOut: () => {
      /* silence stdout in tests */
    },
  };
  command.configureOutput(output);
  return new Command()
    .exitOverride()
    .addCommand(command)
    .configureOutput(output);
};

describe("makeInitCommand", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    tfMock.mockReset();
  });

  it("checks local preconditions before requiring GitHub auth", async () => {
    tfMock.mockRejectedValueOnce(new Error("Terraform not installed"));

    const requireGitHubAuthSpy = vi.fn(() =>
      okAsync({
        authorizationService: mock<AuthorizationService>(),
        gitHubService: mock<GitHubService>(),
      }),
    );
    const requireGitHubAuth: GitHubAuthFactory = requireGitHubAuthSpy;
    const root = makeRoot(makeInitCommand(requireGitHubAuth, { CI: false }));

    await expect(
      root.parseAsync(["init"], { from: "user" }),
    ).rejects.toBeTruthy();
    expect(requireGitHubAuthSpy).not.toHaveBeenCalled();
  });

  it("prints the terraform init failure details instead of a static GitHub repository error", async () => {
    const outputMessages: string[] = [];
    const terraformError = new ExecaError();
    terraformError.shortMessage =
      "Command failed with exit code 1: terraform init";
    terraformError.stderr =
      'Error: failed to load backend\naccess_token = "ghp_secret"';
    const payload = makePayload();
    getPlopInstance.mockResolvedValue({});
    collectMonorepoPayload.mockResolvedValue({ generator: {}, payload });
    runMonorepoActions.mockResolvedValue(payload);
    vi.spyOn(process, "chdir").mockImplementation(() => undefined);
    tfMock
      .mockResolvedValueOnce({ stdout: "Terraform v1.0.0" })
      .mockResolvedValueOnce({ stdout: "0.0.0" })
      .mockReturnValueOnce(
        vi.fn((strings: TemplateStringsArray) =>
          strings.join("").includes("init")
            ? Promise.reject(terraformError)
            : Promise.resolve({ stdout: "" }),
        ),
      );

    const requireGitHubAuthSpy = vi.fn(() =>
      okAsync({
        authorizationService: mock<AuthorizationService>(),
        gitHubService: mock<GitHubService>(),
      }),
    );
    const requireGitHubAuth: GitHubAuthFactory = requireGitHubAuthSpy;
    const root = makeRoot(
      makeInitCommand(requireGitHubAuth, { CI: false }),
      outputMessages,
    );

    await expect(
      root.parseAsync(["init", "--publish"], { from: "user" }),
    ).rejects.toBeTruthy();

    const message = outputMessages.join("");
    expect(message).toContain(
      "Terraform init failed while creating the GitHub repository.",
    );
    expect(message).toContain(
      "Command failed with exit code 1: terraform init",
    );
    expect(message).toContain("Error: failed to load backend");
    expect(message).not.toContain("Failed to create GitHub repository.");
    expect(message).not.toContain("ghp_secret");
  });
});
