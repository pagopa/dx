/**
 * Tests for the `add environment` Commander command flags.
 *
 * Covers the user-facing CLI contract for CES-2134: flag registration,
 * validation, and passing prefilled answers into the environment generator.
 */

import { Command } from "commander";
import { okAsync } from "neverthrow";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";
import type { Payload as EnvironmentPayload } from "../../../plop/generators/environment/index.js";

const mocks = vi.hoisted(() => ({
  collectDeploymentEnvironmentPayload: vi.fn(),
  getPlopInstance: vi.fn(),
  runDeploymentEnvironmentActions: vi.fn(),
  tf$: vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
    void args;
    return { stdout: '{"user":{"name":"test@example.com"}}' };
  }),
}));

vi.mock("ora", () => ({
  oraPromise: <T>(promise: Promise<T>) => promise,
}));
vi.mock("../../../plop/index.js", () => ({
  collectDeploymentEnvironmentPayload:
    mocks.collectDeploymentEnvironmentPayload,
  getPlopInstance: mocks.getPlopInstance,
  runDeploymentEnvironmentActions: mocks.runDeploymentEnvironmentActions,
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));

import {
  getEnvironmentInitialAnswers,
  makeAddCommand,
  parseAddEnvironmentCommandOptions,
} from "../add.js";

const payload: EnvironmentPayload = {
  env: {
    cloudAccounts: [
      {
        csp: "azure",
        defaultLocation: "italynorth",
        displayName: "DEV-FooBar",
        id: "sub-123",
      },
    ],
    name: "dev",
    prefix: "dx",
  },
  github: { owner: "pagopa", repo: "dx" },
  tags: {
    BusinessUnit: "Platform",
    CostCenter: "TS000",
    ManagementTeam: "Engineering",
  },
  workspace: {
    domain: "payments",
  },
};

const silentOutput = {
  writeErr: () => {
    /* silence stderr in tests */
  },
  writeOut: () => {
    /* silence stdout in tests */
  },
};

const makeProgram = () => {
  const requireGitHubAuth: GitHubAuthFactory = () =>
    okAsync({
      authorizationService: mock<AuthorizationService>(),
      gitHubService: mock<GitHubService>(),
    });

  const addCommand = makeAddCommand(requireGitHubAuth, { CI: false });
  addCommand.exitOverride().configureOutput(silentOutput);

  return new Command()
    .exitOverride()
    .addCommand(addCommand)
    .configureOutput(silentOutput);
};

describe("makeAddCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlopInstance.mockResolvedValue({});
    mocks.collectDeploymentEnvironmentPayload.mockResolvedValue({
      generator: {},
      payload,
    });
    mocks.runDeploymentEnvironmentActions.mockResolvedValue(payload);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registers flags for the agreed add environment inputs", () => {
    const requireGitHubAuth: GitHubAuthFactory = () =>
      okAsync({
        authorizationService: mock<AuthorizationService>(),
        gitHubService: mock<GitHubService>(),
      });
    const environmentCommand = makeAddCommand(requireGitHubAuth, {
      CI: false,
    }).commands[0];

    const flags =
      environmentCommand?.options.flatMap((option) => [
        option.flags,
        option.long,
      ]) ?? [];

    expect(flags).toEqual(
      expect.arrayContaining([
        "-y, --yes",
        "--name <name>",
        "--account <subscription-id>",
        "--location <subscription-id=region>",
        "--prefix <prefix>",
        "--domain <domain>",
        "--business-unit <business-unit>",
        "--management-team <management-team>",
        "--runner-app-id <runner-app-id>",
        "--client-id <client-id>",
        "--installation-id <installation-id>",
        "--private-key-path <private-key-path>",
      ]),
    );
  });

  it("passes provided flags to the deployment environment generator as prefilled answers", async () => {
    const program = makeProgram();

    await program.parseAsync([
      "node",
      "dx",
      "add",
      "environment",
      "--name",
      "dev",
      "--account",
      "sub-123",
      "--account",
      "sub-456",
      "--location",
      "sub-123=italynorth",
      "--location",
      "sub-456=westeurope",
      "--prefix",
      "dx",
      "--domain",
      "payments",
      "--business-unit",
      "Platform",
      "--management-team",
      "Engineering",
    ]);

    expect(mocks.collectDeploymentEnvironmentPayload).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined,
      {
        env: {
          cloudAccountIds: ["sub-123", "sub-456"],
          locations: {
            "sub-123": "italynorth",
            "sub-456": "westeurope",
          },
          name: "dev",
          prefix: "dx",
        },
        tags: {
          BusinessUnit: "Platform",
          ManagementTeam: "Engineering",
        },
        workspace: {
          domain: "payments",
        },
      },
    );
    expect(mocks.runDeploymentEnvironmentActions).toHaveBeenCalledWith(
      expect.anything(),
      payload,
    );
  });

  it("passes provided initialization flags to the deployment environment generator as prefilled answers", async () => {
    const program = makeProgram();
    const tempDir = await mkdtemp(path.join(tmpdir(), "dx-cli-add-command-"));
    const privateKeyPath = path.join(tempDir, "runner-app.pem");

    await writeFile(privateKeyPath, "private-key-from-file\n");

    try {
      await program.parseAsync([
        "node",
        "dx",
        "add",
        "environment",
        "--yes",
        "--runner-app-id",
        "app-id",
        "--client-id",
        "app-client-id",
        "--installation-id",
        "installation-id",
        "--private-key-path",
        privateKeyPath,
      ]);

      expect(mocks.collectDeploymentEnvironmentPayload).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        undefined,
        {
          init: {
            confirm: true,
            runnerAppCredentials: {
              clientId: "app-client-id",
              id: "app-id",
              installationId: "installation-id",
              key: "private-key-from-file\n",
            },
          },
        },
      );
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("rejects an empty private key file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "dx-cli-add-command-"));
    const privateKeyPath = path.join(tempDir, "runner-app.pem");

    await writeFile(privateKeyPath, "   \n");

    try {
      await expect(
        getEnvironmentInitialAnswers(
          parseAddEnvironmentCommandOptions({ privateKeyPath }),
        ),
      ).rejects.toThrow(/Private key file at .* is empty\./);
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });

  it("rejects malformed location mappings with a validation error", async () => {
    expect(() =>
      parseAddEnvironmentCommandOptions({
        account: ["sub-123"],
        location: ["sub-123"],
      }),
    ).toThrow(/Invalid add environment command options/);
  });
});
