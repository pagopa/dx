/**
 * Tests for the init Commander command workflow.
 */

import { Command } from "commander";
import { okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";

const { tfMock } = vi.hoisted(() => ({
  tfMock: vi.fn(),
}));

vi.mock("ora", () => ({
  oraPromise: <T>(promise: Promise<T>) => promise,
}));

vi.mock("../../../execa/terraform.js", () => ({
  tf$: tfMock,
}));

import { makeInitCommand } from "../init.js";

const makeRoot = (command: Command) =>
  new Command()
    .exitOverride()
    .addCommand(command)
    .configureOutput({
      writeErr: () => {
        /* silence stderr in tests */
      },
      writeOut: () => {
        /* silence stdout in tests */
      },
    });

describe("makeInitCommand", () => {
  afterEach(() => {
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
});
