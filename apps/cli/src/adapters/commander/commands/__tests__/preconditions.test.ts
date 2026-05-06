import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  oraPromise: vi.fn((promise: Promise<unknown>) => promise),
  tf$: vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
    void args;
    return { stdout: '{"user":{"name":"test@example.com"}}' };
  }),
}));

vi.mock("ora", () => ({ oraPromise: mocks.oraPromise }));
vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));

import {
  checkAddEnvironmentPreconditions,
  checkInitPreconditions,
} from "../init.js";

const calledCommands = () =>
  mocks.tf$.mock.calls.map(([strings, ...values]) =>
    strings.reduce(
      (command, part, index) => command + part + String(values[index] ?? ""),
      "",
    ),
  );

describe("init preconditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkInitPreconditions does not require Azure login", async () => {
    const result = await checkInitPreconditions();

    expect(result.isOk()).toBe(true);
    expect(calledCommands()).toEqual(["terraform -version", "corepack -v"]);
  });

  it("checkAddEnvironmentPreconditions requires Azure login", async () => {
    const result = await checkAddEnvironmentPreconditions();

    expect(result.isOk()).toBe(true);
    expect(calledCommands()).toEqual([
      "terraform -version",
      "az account show",
      "az group list",
      "corepack -v",
    ]);
  });
});
