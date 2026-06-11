import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";

import { Reporter } from "../reporter.ts";

describe("Reporter", () => {
  let originalCwd = "";
  let tempDirectoryPath = "";

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDirectoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-tasks-reporter-"),
    );
    process.chdir(tempDirectoryPath);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
  });

  it("writes validated reports under the namespace directory within the base directory", async () => {
    const reporter = new Reporter(tempDirectoryPath);
    const terraformPlanReporter = reporter.registerNamespace(
      "terraform-plan",
      z.object({
        modulePath: z.string(),
        planOutput: z.string(),
      }),
    );

    await terraformPlanReporter.write("bW9kdWxl", {
      modulePath: "/tmp/module",
      planOutput: "No changes.",
    });

    await expect(
      fs.readFile(
        path.join(
          tempDirectoryPath,
          ".dx-tasks",
          "terraform-plan",
          "bW9kdWxl.json",
        ),
        "utf8",
      ),
    ).resolves.toBe(`{
  "modulePath": "/tmp/module",
  "planOutput": "No changes."
}`);
  });

  it("rejects reports that do not match the schema", async () => {
    const reporter = new Reporter(tempDirectoryPath);
    const terraformPlanReporter = reporter.registerNamespace(
      "terraform-plan",
      z.object({
        modulePath: z.string(),
        planOutput: z.string(),
      }),
    );

    await expect(
      terraformPlanReporter.write(
        "bW9kdWxl",
        JSON.parse('{"modulePath":"/tmp/module","planOutput":1}'),
      ),
    ).rejects.toThrow();
  });

  it("rejects duplicate namespace registrations", () => {
    const reporter = new Reporter(tempDirectoryPath);

    reporter.registerNamespace(
      "terraform-plan",
      z.object({
        modulePath: z.string(),
        planOutput: z.string(),
      }),
    );

    expect(() => {
      reporter.registerNamespace(
        "terraform-plan",
        z.object({
          modulePath: z.string(),
          planOutput: z.string(),
        }),
      );
    }).toThrow('Reporter namespace "terraform-plan" is already registered');
  });

  it("wraps directory creation failures with reporter context", async () => {
    const reporter = new Reporter(tempDirectoryPath);
    const terraformPlanReporter = reporter.registerNamespace(
      "terraform-plan",
      z.object({
        modulePath: z.string(),
        planOutput: z.string(),
      }),
    );
    const mkdirError = new Error("EACCES");

    vi.spyOn(fs, "mkdir").mockRejectedValueOnce(mkdirError);

    await expect(
      terraformPlanReporter.write("bW9kdWxl", {
        modulePath: "/tmp/module",
        planOutput: "No changes.",
      }),
    ).rejects.toThrow(
      `Failed to create reporter namespace directory "${path.join(
        tempDirectoryPath,
        ".dx-tasks",
        "terraform-plan",
      )}"`,
    );
  });

  it("wraps report file write failures with reporter context", async () => {
    const reporter = new Reporter(tempDirectoryPath);
    const terraformPlanReporter = reporter.registerNamespace(
      "terraform-plan",
      z.object({
        modulePath: z.string(),
        planOutput: z.string(),
      }),
    );
    const writeError = new Error("EROFS");

    vi.spyOn(fs, "writeFile").mockRejectedValueOnce(writeError);

    await expect(
      terraformPlanReporter.write("bW9kdWxl", {
        modulePath: "/tmp/module",
        planOutput: "No changes.",
      }),
    ).rejects.toThrow(
      `Failed to write reporter file "${path.join(
        tempDirectoryPath,
        ".dx-tasks",
        "terraform-plan",
        "bW9kdWxl.json",
      )}"`,
    );
  });
});
