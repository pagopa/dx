import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultTaskDispatcher } from "../default-dispatcher.ts";
import { createTaskDispatcher } from "../dispatcher.ts";
import { renderReportTask } from "../tasks.ts";

describe("renderReport task", () => {
  let originalCwd = "";
  let tempDirectoryPath = "";

  const seedTerraformPlanReport = async (
    objectName: string,
    content: { modulePath: string; planOutput: string },
  ): Promise<void> => {
    const namespaceDirectoryPath = path.join(
      tempDirectoryPath,
      ".dx-tasks",
      "terraform-plan",
    );
    await fs.mkdir(namespaceDirectoryPath, { recursive: true });
    await fs.writeFile(
      path.join(namespaceDirectoryPath, `${objectName}.json`),
      JSON.stringify(content),
      "utf8",
    );
  };

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDirectoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-tasks-render-report-"),
    );
    process.chdir(tempDirectoryPath);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
  });

  it("prints the markdown rendered from persisted terraform-plan reports", async () => {
    await seedTerraformPlanReport("a", {
      modulePath: "./infra/modules/example",
      planOutput: "No changes.",
    });
    const dispatcher = createDefaultTaskDispatcher();

    await dispatcher.dispatchTask("renderReport", {});

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      "### Module `./infra/modules/example`\n\n```hcl\nNo changes.\n```",
    );
  });

  it("throws when the task context has no reports", async () => {
    const dispatcher = createTaskDispatcher();
    dispatcher.registerTask(renderReportTask);

    await expect(dispatcher.dispatchTask("renderReport", {})).rejects.toThrow(
      "renderReport requires reports in the task context",
    );
  });
});
