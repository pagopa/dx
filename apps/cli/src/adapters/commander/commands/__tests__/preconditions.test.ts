import { ExecaError } from "execa";
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
    mocks.tf$.mockReset();
    mocks.tf$.mockResolvedValue({
      stdout: '{"user":{"name":"test@example.com"}}',
    });
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

  it("returns Azure login guidance when the account check fails", async () => {
    const accountError = new ExecaError();
    accountError.shortMessage =
      "ERROR: Please run 'az login' to setup account.";
    mocks.tf$
      .mockResolvedValueOnce({ stdout: "Terraform v1.0.0" })
      .mockRejectedValueOnce(accountError);

    const result = await runAddEnvironmentPreconditions(presenter);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.message).toBe(
      "Please log in to Azure CLI using `az login` before running this command.",
    );
    expect(error.cause).toBe(accountError);
    expect(calledCommands()).toEqual(["terraform -version", "az account show"]);
  });

  it("returns the Azure access error when listing resource groups fails", async () => {
    const groupListError = new ExecaError();
    groupListError.shortMessage =
      "ERROR: The client does not have authorization to perform action 'Microsoft.Resources/subscriptions/resourcegroups/read'.";
    mocks.tf$
      .mockResolvedValueOnce({ stdout: "Terraform v1.0.0" })
      .mockResolvedValueOnce({ stdout: '{"user":{"name":"test@example.com"}}' })
      .mockRejectedValueOnce(groupListError);

    const result = await runAddEnvironmentPreconditions(presenter);

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.message).toBe(groupListError.shortMessage);
    expect(error.message).not.toContain("az login");
    expect(error.cause).toBe(groupListError);
    expect(calledCommands()).toEqual([
      "terraform -version",
      "az account show",
      "az group list",
    ]);
  });
});
