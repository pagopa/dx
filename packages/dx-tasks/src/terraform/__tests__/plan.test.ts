import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TerraformPlanPayload } from "../plan.ts";

import { ReportStore } from "../../report-store.ts";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

import {
  terraformPlan,
  terraformPlanReportNamespace,
  terraformPlanReportSchema,
} from "../plan.ts";

const createReports = (baseDirectoryPath: string) =>
  new ReportStore(baseDirectoryPath).register(terraformPlanReportNamespace);

const plans = {
  changes: `[0m[1mazurerm_resource_group.example2: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-02][0m
[0m[1mazurerm_resource_group.example: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-01][0m

Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  [33m~[0m update in-place[0m

Terraform will perform the following actions:

[1m  # azurerm_resource_group.example2[0m will be updated in-place
[0m  [33m~[0m[0m resource "azurerm_resource_group" "example2" {
        id         = "/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-02"
        name       = "plantest-example-rg-02"
      [33m~[0m[0m tags       = {
          [33m~[0m[0m "PRIVATE_KEY" = "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-BEFORE-----END PRIVATE KEY-----" [33m->[0m[0m "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-AFTER-----END PRIVATE KEY-----"
        }
        [90m# (2 unchanged attributes hidden)[0m[0m
    }

[1mPlan:[0m [0m0 to add, 1 to change, 0 to destroy.`,
  changesNoColor: `azurerm_resource_group.example2: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-02]
azurerm_resource_group.example: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-01]

Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  ~ update in-place

Terraform will perform the following actions:

  # azurerm_resource_group.example2 will be updated in-place
  ~ resource "azurerm_resource_group" "example2" {
        id         = "/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-02"
        name       = "plantest-example-rg-02"
      ~ tags       = {
          ~ "PRIVATE_KEY" = "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-BEFORE-----END PRIVATE KEY-----" -> "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-AFTER-----END PRIVATE KEY-----"
        }
        # (2 unchanged attributes hidden)
    }

Plan: 0 to add, 1 to change, 0 to destroy.`,
  noChanges: `[0m[1mazurerm_resource_group.example2: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-02][0m
[0m[1mazurerm_resource_group.example: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-01][0m

[0m[1m[32mNo changes.[0m[1m Your infrastructure matches the configuration.[0m

[0mTerraform has compared your real infrastructure against your configuration
and found no differences, so no changes are needed.`,
  noChangesNoColor: `azurerm_resource_group.example: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-01]
azurerm_resource_group.example2: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-02]

No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration
and found no differences, so no changes are needed.`,
};

const snapshotScenarios: {
  name: string;
  payload?: TerraformPlanPayload;
  stdout: string;
}[] = [
  {
    name: "summarized terraform actions output",
    stdout: plans.changes,
  },
  {
    name: "summarized terraform actions output (-no-color)",
    stdout: plans.changesNoColor,
  },
  {
    name: "summarized no changes output",
    stdout: plans.noChanges,
  },
  {
    name: "summarized no changes output (-no-color)",
    stdout: plans.noChangesNoColor,
  },
  {
    name: "verbose output",
    payload: { modulePath: "/tmp/module", refresh: true, verbose: true },
    stdout: plans.changes,
  },
];

const reportSnapshotScenarios: {
  name: string;
  payload: TerraformPlanPayload;
  stdout: string;
}[] = [
  {
    name: "summarized report output",
    payload: { modulePath: "/tmp/module", report: true },
    stdout: plans.changes,
  },
  {
    name: "summarized report output (-no-color)",
    payload: { modulePath: "/tmp/module", report: true },
    stdout: plans.changesNoColor,
  },
  {
    name: "no changes report output",
    payload: { modulePath: "/tmp/module", report: true },
    stdout: plans.noChanges,
  },
  {
    name: "no changes report output (-no-color)",
    payload: { modulePath: "/tmp/module", report: true },
    stdout: plans.noChangesNoColor,
  },
  {
    name: "verbose report output",
    payload: {
      modulePath: "/tmp/module",
      refresh: true,
      report: true,
      verbose: true,
    },
    stdout: plans.changes,
  },
];

const getTerraformPlanReportPath = (
  baseDirectoryPath: string,
  modulePath: string,
): string =>
  path.join(
    baseDirectoryPath,
    ".dx-tasks",
    "terraform-plan",
    `${Buffer.from(modulePath).toString("base64url")}.json`,
  );

describe("terraformPlan", () => {
  let tempDirectoryPath = "";

  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.stubEnv("CI", "false");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "dx-tasks-terraform-plan-"),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("passes the default terraform plan arguments to runCommand", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: "No changes.",
    });

    await terraformPlan({ modulePath: "/tmp/module" });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      ["plan"],
      "/tmp/module",
      {
        TF_CLI_ARGS_plan: "-lock-timeout=120s ",
        TF_IN_AUTOMATION: "true",
      },
    );
  });

  it("adds refresh, output, and CI arguments to runCommand", async () => {
    vi.stubEnv("CI", "true");
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: "No changes.",
    });

    await terraformPlan({
      modulePath: "/tmp/module",
      out: "plan.tfplan",
      refresh: false,
      verbose: false,
    });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      ["plan"],
      "/tmp/module",
      {
        TF_CLI_ARGS_plan:
          "-lock-timeout=120s -out=plan.tfplan -refresh=false -lock=false -input=false -no-color ",
        TF_IN_AUTOMATION: "true",
      },
    );
  });

  it("throws when terraform exits because of a signal", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: null,
      signal: "SIGTERM",
      stdout: "",
    });

    await expect(terraformPlan({ modulePath: "/tmp/module" })).rejects.toThrow(
      "terraform plan terminated by signal SIGTERM",
    );
  });

  it.each(reportSnapshotScenarios)(
    "matches the report snapshot for $name",
    async ({ payload, stdout }) => {
      const reports = createReports(tempDirectoryPath);

      mockRunCommand.mockResolvedValue({
        exitCode: 0,
        signal: null,
        stdout,
      });

      await terraformPlan(payload, {
        reports,
      });

      await expect(
        fs.readFile(
          getTerraformPlanReportPath(tempDirectoryPath, payload.modulePath),
          "utf8",
        ),
      ).resolves.toMatchSnapshot();
      expect(console.log).toHaveBeenCalledExactlyOnceWith(expect.any(String));
    },
  );

  it.each(snapshotScenarios)(
    "matches the console snapshot for $name",
    async ({ payload, stdout }) => {
      mockRunCommand.mockResolvedValue({
        exitCode: 0,
        signal: null,
        stdout,
      });

      await terraformPlan(payload ?? { modulePath: "/tmp/module" });

      expect(console.log).toHaveBeenCalledExactlyOnceWith(expect.any(String));
      expect(
        vi.mocked(console.log).mock.calls[0]?.[0] ?? "missing console output",
      ).toMatchSnapshot();
    },
  );

  it("writes the report with the expected JSON shape when enabled", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stdout: plans.changes,
    });

    await terraformPlan(
      {
        modulePath: "/tmp/module",
        report: true,
      },
      {
        reports,
      },
    );

    const reportContent = await fs.readFile(
      getTerraformPlanReportPath(tempDirectoryPath, "/tmp/module"),
      "utf8",
    );
    const report = terraformPlanReportSchema.parse(JSON.parse(reportContent));

    expect(report).toMatchObject({
      modulePath: "/tmp/module",
      planOutput: expect.stringContaining(
        "Terraform will perform the following actions:",
      ),
    });
    expect(Object.keys(report)).toStrictEqual(["modulePath", "planOutput"]);
    expect(reportContent).toBe(JSON.stringify(report, null, 2));
    expect(console.log).toHaveBeenCalledExactlyOnceWith(expect.any(String));
  });
});

describe("terraformPlanReportNamespace", () => {
  it("declares the terraform-plan namespace with a markdown renderer", () => {
    expect(terraformPlanReportNamespace.name).toBe("terraform-plan");
    expect(terraformPlanReportNamespace.renderers?.markdown).toBeTypeOf(
      "function",
    );
  });

  it("renders the module path and plan output as a fenced hcl block", () => {
    const markdown = terraformPlanReportNamespace.renderers?.markdown?.({
      modulePath: "./infra/modules/example",
      planOutput: "No changes.",
    });

    expect(markdown).toBe(
      "### Module `./infra/modules/example`\n\n```hcl\nNo changes.\n```",
    );
  });
});
