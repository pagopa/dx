/**
 * Tests for the `add environment` command JSON output contract.
 *
 * Verifies that the command routes progress and the final result through the
 * shared CommandPresenter: step lifecycle events are emitted as NDJSON on
 * stderr while the credential-free result envelope is written to stdout.
 */
import { Command } from "commander";
import { okAsync } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

import type { CloudAccount } from "../../../../domain/cloud-account.js";
import type { GitHubAuthFactory } from "../../../../domain/dependencies.js";
import type { GitHubService } from "../../../../domain/github.js";
import type { TerraformBackend } from "../../../../domain/remote-backend.js";
import type { Payload as EnvironmentPayload } from "../../../plop/generators/environment/index.js";

import {
  AuthorizationResult,
  type AuthorizationService,
} from "../../../../domain/authorization.js";

const mocks = vi.hoisted(() => ({
  collectDeploymentEnvironmentPayload: vi.fn(),
  getPlopInstance: vi.fn(),
  runDeploymentEnvironmentActions: vi.fn(),
  tf$: vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
    void args;
    return { stdout: '{"user":{"name":"test@example.com"}}' };
  }),
}));

vi.mock("../../../plop/index.js", () => ({
  collectDeploymentEnvironmentPayload:
    mocks.collectDeploymentEnvironmentPayload,
  getPlopInstance: mocks.getPlopInstance,
  runDeploymentEnvironmentActions: mocks.runDeploymentEnvironmentActions,
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));

import { makeAddCommand } from "../add.js";

const cloudAccount: CloudAccount = {
  csp: "azure",
  defaultLocation: "italynorth",
  displayName: "DEV-FooBar",
  id: "sub-123",
};

const payload: EnvironmentPayload = {
  env: {
    cloudAccounts: [cloudAccount],
    name: "dev",
    prefix: "dx",
  },
  github: { owner: "pagopa", repo: "test-repo" },
  tags: {
    BusinessUnit: "BU",
    CostCenter: "TS000 - TECNOLOGIA & SERVIZI",
    ManagementTeam: "MT",
    Owner: "DX Platform",
  },
  workspace: { domain: "" },
};

const runnerAppCredentials = {
  clientId: "runner-app-client-id",
  id: "runner-app-id",
  installationId: "runner-app-installation-id",
  key: "runner-app-private-key",
};

const initializationCredentials = {
  clientId: "initialization-client-id",
  id: "initialization-app-id",
  installationId: "initialization-installation-id",
  key: "initialization-private-key",
};

const initialization = {
  cloudAccountsToInitialize: [cloudAccount],
  terraformBackend: { cloudAccount },
};

const terraformBackend: TerraformBackend = {
  resourceGroupName: "dx-d-itn-tfstate-rg-01",
  storageAccountName: "dxditntfst01",
  subscriptionId: cloudAccount.id,
  type: "azurerm",
};

const captureStream = (stream: NodeJS.WriteStream) => {
  const written: string[] = [];
  vi.spyOn(stream, "write").mockImplementation((data: unknown) => {
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

describe("add environment command json output", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlopInstance.mockResolvedValue({});
    mocks.collectDeploymentEnvironmentPayload.mockResolvedValue({
      generator: {},
      payload,
    });
    mocks.runDeploymentEnvironmentActions.mockResolvedValue(payload);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
  });

  it("emits progress events and the final result through the json presenter", async () => {
    const stdout = captureStream(process.stdout);
    const stderr = captureStream(process.stderr);
    const requireGitHubAuth: GitHubAuthFactory = () =>
      okAsync({
        authorizationService: mockDeep<AuthorizationService>(),
        gitHubService: mockDeep<GitHubService>(),
      });

    const program = new Command()
      .option("--output <mode>", "Output mode", "json")
      .addCommand(makeAddCommand(requireGitHubAuth, { CI: false }));

    await program.parseAsync([
      "node",
      "dx",
      "--output",
      "json",
      "add",
      "environment",
    ]);

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
      { name: "Checking mise installation...", status: "start", type: "step" },
      {
        name: "Checking mise installation...",
        status: "success",
        type: "step",
      },
      {
        name: "Checking Azure login status...",
        status: "start",
        type: "step",
      },
      {
        name: "Checking Azure login status...",
        status: "success",
        type: "step",
      },
      {
        name: "Initializing environment generator...",
        status: "start",
        type: "step",
      },
      {
        name: "Initializing environment generator...",
        status: "success",
        type: "step",
      },
      { name: "Creating environment...", status: "start", type: "step" },
      { name: "Creating environment...", status: "success", type: "step" },
    ]);
    expect(parseNdjson(stdout.written)).toEqual([
      { data: { authorizationPrs: [], payload }, ok: true },
    ]);
  });
  describe.each([
    { args: ["--output", "json"], CI: false, mode: "explicit JSON output" },
    { args: ["--output", "text"], CI: true, mode: "CI output" },
  ])("$mode", ({ args, CI }) => {
    it.each([
      {
        authorizationPrs: [],
        expectedPayload: payload,
        name: "an initialized environment",
        sourcePayload: { ...payload, runnerAppCredentials },
      },
      {
        authorizationPrs: [{ url: "https://example.com/authorization-pr" }],
        expectedPayload: { ...payload, init: initialization },
        name: "environment initialization",
        sourcePayload: {
          ...payload,
          init: {
            ...initialization,
            runnerAppCredentials: initializationCredentials,
          },
          runnerAppCredentials,
        },
      },
    ])(
      "preserves resolved backend metadata and omits credentials for $name",
      async ({ authorizationPrs, expectedPayload, sourcePayload }) => {
        const originalPayload = structuredClone(sourcePayload);
        const actionResult = {
          ...sourcePayload,
          terraform: {
            backend: {
              ...terraformBackend,
              accessKey: "terraform-backend-private-value",
            },
            privateValue: "terraform-private-value",
          },
        };
        const originalActionResult = structuredClone(actionResult);
        const stdout = captureStream(process.stdout);
        const stderr = captureStream(process.stderr);
        const authorizationService = mockDeep<AuthorizationService>();
        authorizationService.requestAuthorization.mockReturnValue(
          okAsync(
            new AuthorizationResult("https://example.com/authorization-pr"),
          ),
        );
        const requireGitHubAuth: GitHubAuthFactory = () =>
          okAsync({
            authorizationService,
            gitHubService: mockDeep<GitHubService>(),
          });
        mocks.collectDeploymentEnvironmentPayload.mockResolvedValue({
          generator: {},
          payload: sourcePayload,
        });
        mocks.runDeploymentEnvironmentActions.mockResolvedValue(actionResult);
        const program = new Command()
          .option("--output <mode>", "Output mode", "text")
          .addCommand(makeAddCommand(requireGitHubAuth, { CI }));

        await program.parseAsync(["node", "dx", ...args, "add", "environment"]);

        expect(parseNdjson(stdout.written)).toStrictEqual([
          {
            data: {
              authorizationPrs,
              payload: {
                ...expectedPayload,
                terraform: { backend: terraformBackend },
              },
            },
            ok: true,
          },
        ]);
        const output = [...stdout.written, ...stderr.written].join("");
        expect(output).not.toContain("runnerAppCredentials");
        expect(output).not.toContain(runnerAppCredentials.key);
        expect(output).not.toContain(initializationCredentials.key);
        expect(output).not.toContain(actionResult.terraform.backend.accessKey);
        expect(output).not.toContain(actionResult.terraform.privateValue);
        expect(mocks.runDeploymentEnvironmentActions).toHaveBeenCalledWith(
          expect.anything(),
          originalPayload,
        );
        expect(sourcePayload).toStrictEqual(originalPayload);
        expect(actionResult).toStrictEqual(originalActionResult);
      },
    );
  });

});
