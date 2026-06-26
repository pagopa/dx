/**
 * Tests for the `add environment` command JSON output contract.
 *
 * Verifies that the command routes progress and the final result through the
 * shared CommandPresenter: step lifecycle events are emitted as NDJSON on
 * stderr while the structured result envelope is written to stdout.
 */
import { Command } from "commander";
import { okAsync } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";

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

vi.mock("../../../plop/index.js", () => ({
  collectDeploymentEnvironmentPayload:
    mocks.collectDeploymentEnvironmentPayload,
  getPlopInstance: mocks.getPlopInstance,
  runDeploymentEnvironmentActions: mocks.runDeploymentEnvironmentActions,
}));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));

import { makeAddCommand } from "../add.js";

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
  github: { owner: "pagopa", repo: "test-repo" },
  tags: { BusinessUnit: "BU", CostCenter: "TS000", ManagementTeam: "MT" },
  workspace: { domain: "" },
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
      { name: "Checking Azure login status...", status: "start", type: "step" },
      {
        name: "Checking Azure login status...",
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
});
