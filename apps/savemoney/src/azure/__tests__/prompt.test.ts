import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../index.js";

const readlineMock = vi.hoisted(() => ({ createInterface: vi.fn() }));

vi.mock("readline", () => ({
  createInterface: readlineMock.createInterface,
}));

const invalidConfigs = [
  fileURLToPath(new URL("./fixtures/invalid.yaml", import.meta.url)),
  fileURLToPath(
    new URL("./fixtures/invalid-subscriptions.yaml", import.meta.url),
  ),
];
const partialConfig = fileURLToPath(
  new URL("./fixtures/partial-override.yaml", import.meta.url),
);

let stdinTtyDescriptor: PropertyDescriptor | undefined;
let previousExitCode: typeof process.exitCode;

function mockPrompt(answer: string | undefined): void {
  let closeListener: (() => void) | undefined;
  const prompt = {
    close: vi.fn(() => closeListener?.()),
    once: vi.fn((_event: string, listener: () => void) => {
      closeListener = listener;
      return prompt;
    }),
    question: vi.fn((_question: string, callback: (value: string) => void) => {
      queueMicrotask(() => {
        if (answer === undefined) closeListener?.();
        else callback(answer);
      });
    }),
  };
  readlineMock.createInterface.mockReturnValue(prompt);
}

function setStdinTTY(isTTY: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", {
    configurable: true,
    value: isTTY,
  });
}

beforeEach(() => {
  stdinTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
  previousExitCode = process.exitCode;
  process.exitCode = undefined;
  setStdinTTY(true);
  vi.stubEnv("ARM_SUBSCRIPTION_ID", "");
  readlineMock.createInterface.mockReset();
});

afterEach(() => {
  process.exitCode = previousExitCode;
  vi.unstubAllEnvs();
  readlineMock.createInterface.mockReset();
  if (stdinTtyDescriptor) {
    Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
  } else {
    Reflect.deleteProperty(process.stdin, "isTTY");
  }
});

describe("subscription ID prompt", () => {
  it("writes to stderr and splits multiple IDs", async () => {
    mockPrompt("first-subscription, second-subscription");

    const config = await loadConfig(undefined, { interactive: true });

    expect(config.subscriptionIds).toEqual([
      "first-subscription",
      "second-subscription",
    ]);
    expect(readlineMock.createInterface).toHaveBeenCalledWith({
      input: process.stdin,
      output: process.stderr,
    });
  });

  it("skips prompting when IDs come from CLI, YAML, or environment", async () => {
    vi.stubEnv("ARM_SUBSCRIPTION_ID", "environment-subscription");
    const environment = await loadConfig(undefined, { interactive: true });
    const cli = await loadConfig(undefined, {
      interactive: true,
      subscriptionIds: ["cli-subscription"],
    });
    const yaml = await loadConfig(partialConfig, { interactive: true });

    expect([
      environment.subscriptionIds,
      cli.subscriptionIds,
      yaml.subscriptionIds,
    ]).toEqual([
      ["environment-subscription"],
      ["cli-subscription"],
      ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],
    ]);
    expect(readlineMock.createInterface).not.toHaveBeenCalled();
  });

  it("does not open readline without a TTY", async () => {
    setStdinTTY(false);

    await expect(loadConfig(undefined, { interactive: true })).rejects.toThrow(
      "Subscription IDs are required",
    );
    expect(readlineMock.createInterface).not.toHaveBeenCalled();
  });

  it.each([
    ["empty input", "  ,  ", "Subscription IDs are required"],
    ["EOF", undefined, "Subscription ID prompt was closed before an answer"],
  ])("fails clearly for %s", async (_, answer, message) => {
    mockPrompt(answer);

    await expect(loadConfig(undefined, { interactive: true })).rejects.toThrow(
      message,
    );
  });

  it.each(invalidConfigs)(
    "rejects invalid config before prompting: %s",
    async (configPath) => {
      await expect(
        loadConfig(configPath, { interactive: true }),
      ).rejects.toThrow("Invalid config file");
      expect(readlineMock.createInterface).not.toHaveBeenCalled();
    },
  );
});
