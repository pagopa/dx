import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CommandPresenter } from "../../../../domain/command-presenter.js";

const mocks = vi.hoisted(() => ({
  tf$: vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
    void args;
    return { stdout: '{"user":{"name":"test@example.com"}}' };
  }),
}));

vi.mock("../../../execa/terraform.js", () => ({ tf$: mocks.tf$ }));

import {
  runAddEnvironmentPreconditions,
  runInitPreconditions,
} from "../init.js";

// A pass-through presenter runs each tracked step without rendering output, so
// the tests focus on the underlying CLI command sequence.
const presenter: CommandPresenter = {
  reportError: () => undefined,
  reportResult: () => undefined,
  trackStep: <T>(_name: string, task: () => Promise<T>): Promise<T> => task(),
};

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

  it("runInitPreconditions does not require Azure login", async () => {
    const result = await runInitPreconditions(presenter);

    expect(result.isOk()).toBe(true);
    expect(calledCommands()).toEqual(["terraform -version", "corepack -v"]);
  });

  it("runAddEnvironmentPreconditions requires Azure login", async () => {
    const result = await runAddEnvironmentPreconditions(presenter);

    expect(result.isOk()).toBe(true);
    expect(calledCommands()).toEqual([
      "terraform -version",
      "az account show",
      "az group list",
      "corepack -v",
    ]);
  });
});
