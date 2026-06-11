import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

import { createDefaultTaskDispatcher } from "../default-dispatcher.ts";

describe("createDefaultTaskDispatcher", () => {
  let originalCwd = "";
  let tempDirectoryPath = "";

  beforeEach(() => {
    originalCwd = process.cwd();
    mockRunCommand.mockReset();
    vi.stubEnv("CI", "false");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-tasks-default-dispatcher-"),
    );
    process.chdir(tempDirectoryPath);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("registers terraformPlan and dispatches its decoded payload", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: "No changes.",
    });
    const dispatcher = createDefaultTaskDispatcher();

    await dispatcher.dispatchTask("terraformPlan", {
      modulePath: "/tmp/module",
      report: true,
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      ["plan"],
      "/tmp/module",
      {
        TF_CLI_ARGS_plan: "-lock-timeout=120s ",
        TF_IN_AUTOMATION: "true",
      },
    );
    expect(console.log).toHaveBeenCalledExactlyOnceWith("No changes.");
    await expect(
      fs.readFile(
        path.join(
          tempDirectoryPath,
          ".dx-tasks",
          "terraform-plan",
          "L3RtcC9tb2R1bGU.json",
        ),
        "utf8",
      ),
    ).resolves.toBe(`{
  "modulePath": "/tmp/module",
  "planOutput": "No changes."
}`);
  });
});
