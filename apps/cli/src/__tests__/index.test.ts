/**
 * Tests for CLI runtime wiring in the entrypoint.
 *
 * Verifies that `runCli` parses the environment once and passes the validated
 * `CliEnv` to `makeCli`, so commands can resolve their presenter from it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const parseAsync = vi.fn(async () => undefined);
  const span = {
    end: vi.fn(),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    updateName: vi.fn(),
  };

  return {
    applyCodemodById: vi.fn(),
    configure: vi.fn(async () => undefined),
    enableAzureMonitor: vi.fn(),
    flushTelemetry: vi.fn(async () => undefined),
    getConfig: vi.fn(() => ({})),
    getConsoleSink: vi.fn(() => () => undefined),
    getGitHubPAT: vi.fn(async () => "token"),
    isPagopaOrgMember: vi.fn(async () => false),
    listCodemods: vi.fn(),
    makeCli: vi.fn(
      (...args: [unknown, unknown, unknown, { CI: boolean }, string]) => {
        void args;
        return {
          exitOverride: vi.fn(),
          hook: vi.fn(),
          parseAsync,
          setOptionValue: vi.fn(),
        };
      },
    ),
    makePackageJsonReader: vi.fn(() => ({})),
    makeRepositoryReader: vi.fn(() => ({})),
    parseAsync,
    span,
  };
});

vi.mock("@logtape/logtape", () => ({
  configure: mocks.configure,
  getConsoleSink: mocks.getConsoleSink,
  getLogger: vi.fn(() => ({ error: vi.fn() })),
}));
vi.mock("@logtape/otel", () => ({
  getOpenTelemetrySink: () => () => undefined,
}));
vi.mock("@opentelemetry/api", () => ({
  SpanKind: { SERVER: 1 },
  SpanStatusCode: { ERROR: 2 },
  context: {
    active: () => ({}),
    with: (_ctx: unknown, fn: () => unknown) => fn(),
  },
  trace: {
    getActiveSpan: () => mocks.span,
    getTracer: () => ({ startSpan: () => mocks.span }),
    setSpan: () => ({}),
  },
}));
vi.mock("@opentelemetry/api-logs", () => ({
  logs: { getLoggerProvider: () => ({}) },
}));
vi.mock("execa", () => ({
  execa: vi.fn(() => Promise.resolve({ stdout: "{}" })),
}));
vi.mock("octokit", () => ({ Octokit: vi.fn() }));
vi.mock("../adapters/azure-monitor/instrumentation.js", () => ({
  enableAzureMonitor: mocks.enableAzureMonitor,
}));
vi.mock("../adapters/azure-monitor/telemetry.js", () => ({
  flushTelemetry: mocks.flushTelemetry,
}));
vi.mock("../adapters/codemods/index.js", () => ({ default: {} }));
vi.mock("../adapters/commander/index.js", () => ({
  makeCli: mocks.makeCli,
}));
vi.mock("../adapters/node/package-json.js", () => ({
  makePackageJsonReader: mocks.makePackageJsonReader,
}));
vi.mock("../adapters/node/repository.js", () => ({
  makeRepositoryReader: mocks.makeRepositoryReader,
}));
vi.mock("../adapters/octokit/index.js", () => ({
  OctokitGitHubService: vi.fn(),
  getGitHubPAT: mocks.getGitHubPAT,
  isPagopaOrgMember: mocks.isPagopaOrgMember,
}));
vi.mock("../adapters/pagopa-technology/azure-authorization.js", () => ({
  makeAzureAuthorizationService: vi.fn(),
}));
vi.mock("../config.js", () => ({ getConfig: mocks.getConfig }));
vi.mock("../domain/info.js", () => ({
  getInfo: vi.fn(() => vi.fn()),
}));
vi.mock("../use-cases/apply-codemod.js", () => ({
  applyCodemodById: mocks.applyCodemodById,
}));
vi.mock("../use-cases/list-codemods.js", () => ({
  listCodemods: mocks.listCodemods,
}));

import { runCli } from "../index.js";

const getEnv = () => mocks.makeCli.mock.calls[0]?.[3];

describe("runCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Neutralize any ambient CI value so tests control it explicitly.
    vi.stubEnv("CI", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses CI=true into the env passed to makeCli", async () => {
    vi.stubEnv("CI", "true");

    await runCli("0.0.0");

    expect(getEnv()?.CI).toBe(true);
  });

  it("defaults CI to false when the variable is not set", async () => {
    vi.stubEnv("CI", undefined);

    await runCli("0.0.0");

    expect(getEnv()?.CI).toBe(false);
  });

  it("does not model the presenter as a use case", async () => {
    await runCli("0.0.0");

    expect(mocks.makeCli.mock.calls[0]?.[2]).not.toHaveProperty(
      "presenterRuntime",
    );
  });
});
