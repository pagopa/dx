import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { GitHubService } from "../../../../domain/github.js";

const mocks = vi.hoisted(() => {
  const tf$ = vi.fn(async (...args: [TemplateStringsArray, ...unknown[]]) => {
    void args;
    return { stdout: "" };
  });

  return {
    getPlopInstance: vi.fn(async () => ({})),
    oraPromise: vi.fn((promise: Promise<unknown>) => promise),
    runMonorepoGenerator: vi.fn(async () => {
      throw new Error("generator reached");
    }),
    tf$,
  };
});

vi.mock("ora", () => ({
  oraPromise: mocks.oraPromise,
}));

vi.mock("../../../execa/terraform.js", () => ({
  tf$: mocks.tf$,
}));

vi.mock("../../../plop/index.js", () => ({
  getPlopInstance: mocks.getPlopInstance,
  runMonorepoGenerator: mocks.runMonorepoGenerator,
}));

import { makeInitCommand } from "../init.js";

const configureCommandOutput = (command: Command): Command => {
  command.exitOverride().configureOutput({
    writeErr: () => {
      /* silence stderr in tests */
    },
    writeOut: () => {
      /* silence stdout in tests */
    },
  });

  command.commands.forEach((subcommand) => {
    configureCommandOutput(subcommand);
  });

  return command;
};

const commandToString = (strings: TemplateStringsArray, values: unknown[]) =>
  strings.reduce(
    (command, part, index) => command + part + String(values[index] ?? ""),
    "",
  );

const captureCommandErrorMessage = async (
  argv: string[],
  child: Command,
): Promise<string> => {
  const program = configureCommandOutput(new Command().name("dx"));
  configureCommandOutput(child);
  program.addCommand(child);

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error("expected command to fail");
};

const getCalledCommands = () =>
  mocks.tf$.mock.calls.map(
    ([strings, ...values]: [TemplateStringsArray, ...unknown[]]) =>
      commandToString(strings, values),
  );

describe("makeInitCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlopInstance.mockResolvedValue({});
    mocks.runMonorepoGenerator.mockRejectedValue(
      new Error("generator reached"),
    );
    mocks.tf$.mockImplementation(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const command = commandToString(strings, values);

        if (
          command === "terraform -version" ||
          command === "corepack -v" ||
          command === "az account show" ||
          command === "az group list"
        ) {
          return { stdout: "" };
        }

        throw new Error(`Unexpected command: ${command}`);
      },
    );
  });

  it("does not require Azure login before running init", async () => {
    const message = await captureCommandErrorMessage(
      ["init"],
      makeInitCommand({
        gitHubService: mock<GitHubService>(),
      }),
    );

    expect(message).toContain("Failed to run the generator");
    expect(message).not.toContain("Please log in to Azure CLI");

    const calledCommands = getCalledCommands();
    expect(calledCommands).toContain("terraform -version");
    expect(calledCommands).toContain("corepack -v");
    expect(calledCommands).not.toContain("az account show");
    expect(calledCommands).not.toContain("az group list");
  });
});
