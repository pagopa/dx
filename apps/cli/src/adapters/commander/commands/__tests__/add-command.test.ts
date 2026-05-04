import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import type { AuthorizationService } from "../../../../domain/authorization.js";
import type { GitHubService } from "../../../../domain/github.js";

const mocks = vi.hoisted(() => ({
  getPlopInstance: vi.fn(async () => ({})),
  oraPromise: vi.fn((promise: Promise<unknown>) => promise),
  runDeploymentEnvironmentGenerator: vi.fn(async () => {
    throw new Error("generator reached");
  }),
  tf$: vi.fn(async () => ({ stdout: "" })),
}));

vi.mock("ora", () => ({
  oraPromise: mocks.oraPromise,
}));

vi.mock("../../../execa/terraform.js", () => ({
  tf$: mocks.tf$,
}));

vi.mock("../../../plop/index.js", () => ({
  getPlopInstance: mocks.getPlopInstance,
  runDeploymentEnvironmentGenerator: mocks.runDeploymentEnvironmentGenerator,
}));

import { makeAddCommand } from "../add.js";

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

describe("makeAddCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlopInstance.mockResolvedValue({});
    mocks.runDeploymentEnvironmentGenerator.mockRejectedValue(
      new Error("generator reached"),
    );
    mocks.tf$.mockImplementation(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const command = commandToString(strings, values);

        if (command === "terraform -version" || command === "corepack -v") {
          return { stdout: "" };
        }

        if (command === "az account show" || command === "az group list") {
          throw new Error("Azure login missing");
        }

        throw new Error(`Unexpected command: ${command}`);
      },
    );
  });

  it("still requires Azure login before adding an environment", async () => {
    const message = await captureCommandErrorMessage(
      ["add", "environment"],
      makeAddCommand({
        authorizationService: mock<AuthorizationService>(),
        gitHubService: mock<GitHubService>(),
      }),
    );

    expect(message).toContain(
      "Please log in to Azure CLI using `az login` before running this command.",
    );
  });
});
