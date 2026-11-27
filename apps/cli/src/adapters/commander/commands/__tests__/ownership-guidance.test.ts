/**
 * Manual authorization guidance must not imply that code ownership grants access.
 */
import { Command } from "commander";
import { okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { CodeOwnership } from "../../../../domain/code-ownership.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";

const {
  assertGitHubPackagesAccess,
  collectMonorepoPayload,
  getPlopInstance,
  tf,
} = vi.hoisted(() => ({
  assertGitHubPackagesAccess: vi.fn(),
  collectMonorepoPayload: vi.fn(),
  getPlopInstance: vi.fn(),
  tf: vi.fn(),
}));

vi.mock("ora", () => ({
  oraPromise: <T>(promise: Promise<T>) => promise,
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: tf }));
vi.mock("../../../github/packages.js", () => ({ assertGitHubPackagesAccess }));
vi.mock("../../../plop/index.js", () => ({
  collectMonorepoPayload,
  getPlopInstance,
  runMonorepoActions: vi.fn(),
}));

import { getOwnershipGuidance, makeInitCommand } from "../init.js";

const guidance = (repoOwner: string, ownership: CodeOwnership) =>
  getOwnershipGuidance({ ownership, repoName: "project", repoOwner });

describe("ownership authorization guidance", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    tf.mockReset();
  });

  it("names the exact PagoPA teams in the manual authorization PR instructions", () => {
    const result = guidance("pagopa", {
      namespaceType: "Organization",
      owners: ["@pagopa/product-team", "@alice", "@pagopa/platform-team"],
      reviewerTeams: ["product-team", "platform-team"],
    });
    expect(result.instructions.join("\n")).toContain(
      "grant @pagopa/product-team, @alice, @pagopa/platform-team",
    );
    expect(result.instructions.join("\n")).toContain(
      "product-team, platform-team",
    );
    expect(result.permissionStatus).toBe("manual-authorization-required");
  });

  it("does not assume other organizations have a GitHub authorization repository", () => {
    const result = guidance("another-org", {
      namespaceType: "Organization",
      owners: ["@another-org/team"],
      reviewerTeams: ["team"],
    });
    expect(result.authorizationRepository).toBeUndefined();
    expect(result.instructions.join("\n")).toContain(
      "another-org's authorization process",
    );
    expect(result.instructions.join("\n")).not.toContain(
      "eng-github-authorization",
    );
  });

  it("rejects a personal repository owner with organization guidance and a non-zero exit", async () => {
    const outputMessages: string[] = [];
    const plopModule = await vi.importActual<
      typeof import("../../../plop/index.js")
    >("../../../plop/index.js");
    const github = mock<GitHubService>();
    github.getAccount.mockResolvedValue({ login: "alice", type: "User" });
    getPlopInstance.mockResolvedValue(await plopModule.getPlopInstance());
    collectMonorepoPayload.mockImplementation(
      plopModule.collectMonorepoPayload,
    );
    assertGitHubPackagesAccess.mockResolvedValue(undefined);
    tf.mockResolvedValueOnce({
      stdout: "Terraform v1.0.0",
    }).mockResolvedValueOnce({
      stdout: "0.0.0",
    });

    const requireGitHubAuth: GitHubAuthFactory = () =>
      okAsync({
        authorizationService: mock<AuthorizationService>(),
        gitHubService: github,
      });
    const command = makeInitCommand(requireGitHubAuth, { CI: false });
    command.exitOverride().configureOutput({
      writeErr: (message: string) => outputMessages.push(message),
      writeOut: () => undefined,
    });
    const root = new Command().exitOverride().addCommand(command);

    await expect(
      root.parseAsync(
        ["init", "--owner", "alice", "--name", "new-repository", "--publish"],
        { from: "user" },
      ),
    ).rejects.toMatchObject({ exitCode: 1 });
    expect(outputMessages.join("")).toContain(
      "Use a GitHub organization as --owner for dx init.",
    );
    expect(github.getRepository).not.toHaveBeenCalled();
  });
});
