/** This module verifies the shared Terraform initialization task. */

import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ModuleLockComparison } from "../module-lock.ts";

const commandMocks = vi.hoisted(() => ({
  runCommand: vi.fn(),
}));

const fsMocks = vi.hoisted(() => ({
  mkdtemp: vi.fn(async () => "infra/example/.tfmodules-lock-random"),
  rename: vi.fn(async () => {}),
  rm: vi.fn(async () => {}),
  writeFile: vi.fn(async () => {}),
}));

const lockMocks = vi.hoisted(() => ({
  compareModuleLock: vi.fn(),
}));

vi.mock("../../run-command.ts", () => ({
  runCommand: commandMocks.runCommand,
}));

vi.mock("node:fs/promises", () => ({
  default: fsMocks,
}));

vi.mock("../module-lock.ts", () => ({
  compareModuleLock: lockMocks.compareModuleLock,
}));

import { payloadSchema, terraformInit } from "../init.ts";

const comparison = {
  changes: [{ key: "example", status: "changed" }],
  content: "{}\n",
  formatVersion: 2,
  isDifferent: true,
  path: "infra/example/tfmodules.lock.json",
} satisfies ModuleLockComparison;

describe("terraformInit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    commandMocks.runCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: "Terraform initialized.",
    });
    lockMocks.compareModuleLock.mockResolvedValue(comparison);
  });

  it("initializes Terraform and updates a changed module lock", async () => {
    await terraformInit({
      args: ["-backend=false"],
      modulePath: "infra/example",
    });

    expect(commandMocks.runCommand).toHaveBeenCalledExactlyOnceWith(
      "terraform",
      ["init", "-backend=false", "-get=true"],
      "infra/example",
      {},
    );
    expect(console.log).toHaveBeenCalledWith("Terraform initialized.");
    expect(lockMocks.compareModuleLock).toHaveBeenCalledExactlyOnceWith(
      "infra/example",
    );
    expect(fsMocks.writeFile).toHaveBeenCalledExactlyOnceWith(
      path.join("infra/example/.tfmodules-lock-random", "tfmodules.lock.json"),
      comparison.content,
      {
        encoding: "utf8",
        flag: "wx",
      },
    );
    expect(fsMocks.mkdtemp).toHaveBeenCalledExactlyOnceWith(
      path.join("infra/example", ".tfmodules-lock-"),
    );
    expect(fsMocks.rename).toHaveBeenCalledExactlyOnceWith(
      path.join("infra/example/.tfmodules-lock-random", "tfmodules.lock.json"),
      comparison.path,
    );
    expect(fsMocks.rm).toHaveBeenCalledExactlyOnceWith(
      "infra/example/.tfmodules-lock-random",
      {
        force: true,
        recursive: true,
      },
    );
    expect(console.log).toHaveBeenCalledWith(
      "Updated Terraform module lock at infra/example/tfmodules.lock.json",
    );
  });

  it("normalizes module download arguments before initialization", async () => {
    await terraformInit({
      args: ["-get=true", "--get", "true", "-backend=false"],
      modulePath: "infra/example",
    });

    expect(commandMocks.runCommand).toHaveBeenCalledExactlyOnceWith(
      "terraform",
      ["init", "-backend=false", "-get=true"],
      "infra/example",
      {},
    );
  });

  it("preserves flags after a valueless get argument", async () => {
    await terraformInit({
      args: ["-get", "-backend=false", "--get=true"],
      modulePath: "infra/example",
    });

    expect(commandMocks.runCommand).toHaveBeenCalledExactlyOnceWith(
      "terraform",
      ["init", "-backend=false", "-get=true"],
      "infra/example",
      {},
    );
  });

  it("fails frozen initialization without modifying a stale lock", async () => {
    await expect(
      terraformInit({
        frozenLockfile: true,
        modulePath: "infra/example",
      }),
    ).rejects.toThrow(
      "Terraform module lock is frozen and out of date at infra/example/tfmodules.lock.json: changed: example",
    );
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("fails frozen initialization when a legacy lock requires migration", async () => {
    lockMocks.compareModuleLock.mockResolvedValue({
      ...comparison,
      changes: [],
      formatVersion: 1,
      isDifferent: true,
    });

    await expect(
      terraformInit({
        frozenLockfile: true,
        modulePath: "infra/example",
      }),
    ).rejects.toThrow(
      "Terraform module lock is frozen and out of date at infra/example/tfmodules.lock.json: legacy module lock format (version 1)",
    );
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("accepts an unchanged frozen lock without writing", async () => {
    lockMocks.compareModuleLock.mockResolvedValue({
      ...comparison,
      changes: [],
      isDifferent: false,
    });

    await expect(
      terraformInit({
        frozenLockfile: true,
        modulePath: "infra/example",
      }),
    ).resolves.toBeUndefined();
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("stops before locking when terraform init fails", async () => {
    commandMocks.runCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: "Backend configuration failed.",
      stdout: "",
    });

    await expect(
      terraformInit({ modulePath: "infra/example" }),
    ).rejects.toThrow(
      "terraform init failed with exit code 1\nBackend configuration failed.",
    );
    expect(lockMocks.compareModuleLock).not.toHaveBeenCalled();
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("rejects arguments that disable module downloads", async () => {
    expect(() =>
      payloadSchema.parse({
        args: ["-get=FALSE"],
        modulePath: "infra/example",
      }),
    ).toThrow(
      "The -get=false option is incompatible with Terraform module locking",
    );
    await expect(
      terraformInit({
        args: ["-get", "0"],
        modulePath: "infra/example",
      }),
    ).rejects.toThrow(
      "The -get=false option is incompatible with Terraform module locking",
    );
    expect(commandMocks.runCommand).not.toHaveBeenCalled();
  });
});
