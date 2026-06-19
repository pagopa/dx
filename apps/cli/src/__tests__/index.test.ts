/**
 * Tests for CLI runtime wiring in the entrypoint.
 *
 * Verifies that `runCli` parses the environment once and passes the validated
 * `CliEnv` to `makeCli`, so commands can resolve their presenter from it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const parse = vi.fn();

  return {
    applyCodemodById: vi.fn(),
    configure: vi.fn(async () => undefined),
    getConfig: vi.fn(() => ({})),
    getConsoleSink: vi.fn(() => () => undefined),
    listCodemods: vi.fn(),
    makeCli: vi.fn(
      (...args: [unknown, unknown, unknown, { CI: boolean }, string]) => {
        void args;
        return { parse };
      },
    ),
    makePackageJsonReader: vi.fn(() => ({})),
    makeRepositoryReader: vi.fn(() => ({})),
    parse,
  };
});

vi.mock("@logtape/logtape", () => ({
  configure: mocks.configure,
  getConsoleSink: mocks.getConsoleSink,
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
