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
  appendPlanOutputToSummary,
  terraformPlan,
  terraformPlanReportNamespace,
  terraformPlanReportSchema,
  truncateForConsoleLog,
} from "../plan.ts";

const createReports = (baseDirectoryPath: string) =>
  new ReportStore(baseDirectoryPath).register(terraformPlanReportNamespace);

type TerraformPlanMarkdownRenderer = NonNullable<
  NonNullable<typeof terraformPlanReportNamespace.renderers>["markdown"]
>;

const renderTerraformPlanMarkdown = (
  reports: Parameters<TerraformPlanMarkdownRenderer>[0],
  context: Parameters<TerraformPlanMarkdownRenderer>[1] = {},
): string => {
  const renderer = terraformPlanReportNamespace.renderers?.markdown;

  if (!renderer) {
    throw new Error("Terraform plan Markdown renderer is not registered");
  }

  return renderer(reports, context);
};

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
  error: `Error: invalid Terraform configuration

The module contains invalid configuration.`,
  failedActionsNoColor: `azurerm_resource_group.example: Refreshing state... [id=/subscriptions/35e6e3b2-4388-470e-a1b9-ad3bc34326d1/resourceGroups/plantest-example-rg-01]

Terraform planned the following actions, but then encountered a problem:

  # azurerm_key_vault_secret.example will be created
  + resource "azurerm_key_vault_secret" "example" {
      + client_secret = "super-secret-value"
      + name          = "example"
    }`,
  failureDiagnostics: `Error: Unsupported argument

  on ../_modules/azure/secrets.tf line 5, in resource "github_actions_secret" "codecov_token":
   5:   client_secret = "super-secret-value"

An argument named "client_secret" is not expected here.`,
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
  warning: `Warning: Deprecated attribute

The attribute "foo" is deprecated.

Use "bar" instead.`,
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

const createTestDirectory = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "dx-tasks-terraform-plan-"));

const readTerraformPlanReport = async (
  baseDirectoryPath: string,
  modulePath: string,
) =>
  terraformPlanReportSchema.parse(
    JSON.parse(
      await fs.readFile(
        getTerraformPlanReportPath(baseDirectoryPath, modulePath),
        "utf8",
      ),
    ),
  );

describe("terraformPlan", () => {
  let tempDirectoryPath = "";

  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.stubEnv("CI", "false");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await createTestDirectory();
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
      stderr: "",
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
      stderr: "",
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
      stderr: "",
      stdout: "",
    });

    await expect(terraformPlan({ modulePath: "/tmp/module" })).rejects.toThrow(
      "Terraform plan terminated by signal SIGTERM",
    );
  });

  it.each(reportSnapshotScenarios)(
    "matches the report snapshot for $name",
    async ({ payload, stdout }) => {
      const reports = createReports(tempDirectoryPath);

      mockRunCommand.mockResolvedValue({
        exitCode: 0,
        signal: null,
        stderr: "",
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
        stderr: "",
        stdout,
      });

      await terraformPlan(payload ?? { modulePath: "/tmp/module" });

      expect(console.log).toHaveBeenCalledExactlyOnceWith(expect.any(String));
      expect(
        vi.mocked(console.log).mock.calls[0]?.[0] ?? "missing console output",
      ).toMatchSnapshot();
    },
  );

  it("prints masked output when no plan section is available", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: 'Terraform diagnostic\nclient_secret = "super-secret-value"',
    });

    await terraformPlan({ modulePath: "/tmp/module" });

    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      'Terraform diagnostic\nclient_secret = "[REDACTED]"',
    );
  });

  it("writes the report with the expected JSON shape when enabled", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
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
      notices: [],
      planOutput: expect.stringContaining(
        "Terraform will perform the following actions:",
      ),
      success: true,
      summaryLine: "Plan: 0 to add, 1 to change, 0 to destroy.",
    });
    expect(Object.keys(report)).toStrictEqual([
      "modulePath",
      "notices",
      "planOutput",
      "success",
      "summaryLine",
    ]);
    expect(reportContent).toBe(JSON.stringify(report, null, 2));
    expect(console.log).toHaveBeenCalledExactlyOnceWith(expect.any(String));
  });
});

describe("terraformPlan notice reports", () => {
  let tempDirectoryPath = "";

  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.stubEnv("CI", "false");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await createTestDirectory();
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("writes warning notices from terraform output when report is enabled", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: plans.warning,
      stdout: plans.noChangesNoColor,
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

    const report = await readTerraformPlanReport(
      tempDirectoryPath,
      "/tmp/module",
    );

    expect(report).toMatchObject({
      modulePath: "/tmp/module",
      notices: [
        {
          message: plans.warning,
          severity: "warning",
        },
      ],
      planOutput: "No changes. Your infrastructure matches the configuration.",
      success: true,
    });
  });
});

describe("terraformPlan failure reports", () => {
  let tempDirectoryPath = "";

  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.stubEnv("CI", "false");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await createTestDirectory();
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("writes a failure report before rejecting when terraform exits non-zero", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: "Error: invalid Terraform configuration",
      stdout: plans.changesNoColor,
    });

    await expect(
      terraformPlan(
        {
          modulePath: "/tmp/module",
          report: true,
        },
        {
          reports,
        },
      ),
    ).rejects.toThrow("Terraform plan exited with code 1");

    const report = await readTerraformPlanReport(
      tempDirectoryPath,
      "/tmp/module",
    );
    const expectedPlanOutput = `${plans.changesNoColor
      .slice(plans.changesNoColor.indexOf("Terraform will perform"))
      .replaceAll(
        "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-BEFORE-----END PRIVATE KEY-----",
        "[REDACTED]",
      )
      .replaceAll(
        "-----BEGIN PRIVATE KEY-----FAKE-PRIVATE-KEY-AFTER-----END PRIVATE KEY-----",
        "[REDACTED]",
      )}\nError: invalid Terraform configuration`;

    expect(report).toStrictEqual({
      modulePath: "/tmp/module",
      notices: [
        {
          message: "Error: invalid Terraform configuration",
          severity: "error",
        },
      ],
      planOutput: expectedPlanOutput,
      success: false,
      summaryLine: "Plan: 0 to add, 1 to change, 0 to destroy.",
    });
    expect(console.log).toHaveBeenCalledExactlyOnceWith(expectedPlanOutput);
  });

  it("writes multiple notices before rejecting when terraform exits non-zero", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: `${plans.warning}\n\n${plans.error}`,
      stdout: plans.noChangesNoColor,
    });

    await expect(
      terraformPlan(
        {
          modulePath: "/tmp/module",
          report: true,
        },
        {
          reports,
        },
      ),
    ).rejects.toThrow("Terraform plan exited with code 1");

    const report = await readTerraformPlanReport(
      tempDirectoryPath,
      "/tmp/module",
    );

    expect(report.notices).toStrictEqual([
      {
        message: plans.warning,
        severity: "warning",
      },
      {
        message: plans.error,
        severity: "error",
      },
    ]);
  });

  it("does not write a failure report when terraform exits by signal", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: null,
      signal: "SIGTERM",
      stderr: "",
      stdout: "Partial Terraform output",
    });

    await expect(
      terraformPlan(
        {
          modulePath: "/tmp/module",
          report: true,
        },
        {
          reports,
        },
      ),
    ).rejects.toThrow("Terraform plan terminated by signal SIGTERM");

    await expect(
      fs.readFile(
        getTerraformPlanReportPath(tempDirectoryPath, "/tmp/module"),
        "utf8",
      ),
    ).rejects.toThrow();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("does not write a failure report when terraform cannot start", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockRejectedValue(new Error("spawn terraform ENOENT"));

    await expect(
      terraformPlan(
        {
          modulePath: "/tmp/module",
          report: true,
        },
        {
          reports,
        },
      ),
    ).rejects.toThrow("spawn terraform ENOENT");

    await expect(
      fs.readFile(
        getTerraformPlanReportPath(tempDirectoryPath, "/tmp/module"),
        "utf8",
      ),
    ).rejects.toThrow();
    expect(console.log).not.toHaveBeenCalled();
  });
});

describe("terraformPlan failed action reports", () => {
  let tempDirectoryPath = "";

  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.stubEnv("CI", "false");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await createTestDirectory();
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("prints the failed plan section before rejecting when terraform exits non-zero", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: plans.error,
      stdout: plans.failedActionsNoColor,
    });

    await expect(
      terraformPlan(
        {
          modulePath: "/tmp/module",
          report: true,
        },
        {
          reports,
        },
      ),
    ).rejects.toThrow("Terraform plan exited with code 1");

    const expectedPlanOutput = `${plans.failedActionsNoColor
      .slice(
        plans.failedActionsNoColor.indexOf("Terraform planned the following"),
      )
      .replace(
        'client_secret = "super-secret-value"',
        'client_secret = "[REDACTED]"',
      )}\n${plans.error}`;
    const report = await readTerraformPlanReport(
      tempDirectoryPath,
      "/tmp/module",
    );

    expect(report).toStrictEqual({
      modulePath: "/tmp/module",
      notices: [
        {
          message: plans.error,
          severity: "error",
        },
      ],
      planOutput: expectedPlanOutput,
      success: false,
    });
    expect(console.log).toHaveBeenCalledExactlyOnceWith(expectedPlanOutput);
  });

  it("prints masked diagnostics before rejecting when no plan section is available", async () => {
    const reports = createReports(tempDirectoryPath);
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: plans.failureDiagnostics,
      stdout: "",
    });

    await expect(
      terraformPlan(
        {
          modulePath: "/tmp/module",
          report: true,
        },
        {
          reports,
        },
      ),
    ).rejects.toThrow("Terraform plan exited with code 1");

    const expectedPlanOutput = plans.failureDiagnostics.replace(
      'client_secret = "super-secret-value"',
      'client_secret = "[REDACTED]"',
    );
    const report = await readTerraformPlanReport(
      tempDirectoryPath,
      "/tmp/module",
    );

    expect(report).toStrictEqual({
      modulePath: "/tmp/module",
      notices: [
        {
          message: expectedPlanOutput,
          severity: "error",
        },
      ],
      planOutput: expectedPlanOutput,
      success: false,
    });
    expect(console.log).toHaveBeenCalledExactlyOnceWith(expectedPlanOutput);
  });
});

describe("terraformPlanReportNamespace", () => {
  it("declares the terraform-plan namespace with a markdown renderer", () => {
    expect(terraformPlanReportNamespace.name).toBe("terraform-plan");
    expect(terraformPlanReportNamespace.renderers?.markdown).toBeTypeOf(
      "function",
    );
  });

  it("parses report files as successful reports by default", () => {
    expect(
      terraformPlanReportSchema.parse({
        modulePath: "./infra/modules/example",
        notices: [],
        planOutput: "No changes.",
      }),
    ).toStrictEqual({
      modulePath: "./infra/modules/example",
      notices: [],
      planOutput: "No changes.",
      success: true,
    });
  });

  it("renders reports with the status in each module title", () => {
    const markdown = renderTerraformPlanMarkdown([
      {
        modulePath: "./infra/modules/success",
        notices: [],
        planOutput: "No changes.",
        success: true,
        summaryLine: "Plan: 0 to add, 1 to change, 0 to destroy.",
      },
      {
        modulePath: "./infra/modules/failure",
        notices: [],
        planOutput: "Error.",
        success: false,
        summaryLine: "Plan: 0 to add, 0 to change, 1 to destroy.",
      },
    ]);

    expect(markdown).toBe(
      "### Terraform Plan: `./infra/modules/success` - ✅ Success\nPlan: 0 to add, 1 to change, 0 to destroy.\n\n> [!NOTE]\n> Full plan output is not included in this comment.\n> See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.\n\n### Terraform Plan: `./infra/modules/failure` - ❌ Failed\nPlan: 0 to add, 0 to change, 1 to destroy.\n\n> [!NOTE]\n> Full plan output is not included in this comment.\n> See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.",
    );
  });

  it("renders notices before the summary line", () => {
    const markdown = renderTerraformPlanMarkdown([
      {
        modulePath: "./infra/modules/notices",
        notices: [
          {
            message: plans.warning,
            severity: "warning",
          },
          {
            message: plans.error,
            severity: "error",
          },
        ],
        planOutput: "No changes.",
        success: false,
        summaryLine: "Plan: 0 to add, 0 to change, 1 to destroy.",
      },
    ]);

    expect(markdown).toBe(
      '### Terraform Plan: `./infra/modules/notices` - ❌ Failed\n> [!WARNING]\n> Warning: Deprecated attribute\n> \n> The attribute "foo" is deprecated.\n> \n> Use "bar" instead.\n\n> [!CAUTION]\n> Error: invalid Terraform configuration\n> \n> The module contains invalid configuration.\n\nPlan: 0 to add, 0 to change, 1 to destroy.\n\n> [!NOTE]\n> Full plan output is not included in this comment.\n> See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.',
    );
  });

  it("omits plan output from rendered comments", () => {
    const planOutput =
      "Terraform will perform the following actions:\n\n+ resource";
    const markdown = renderTerraformPlanMarkdown([
      {
        modulePath: "./infra/modules/success",
        notices: [],
        planOutput,
        success: true,
      },
    ]);

    expect(markdown).not.toContain("```hcl");
    expect(markdown).not.toContain(planOutput);
  });

  it("links to the workflow run when omitting plan output", () => {
    const longPlanOutput = "x".repeat(25_000);
    const markdown = renderTerraformPlanMarkdown(
      [
        {
          modulePath: "./infra/modules/large",
          notices: [],
          planOutput: longPlanOutput,
          success: true,
          summaryLine: "Plan: 1 to add, 0 to change, 0 to destroy.",
        },
      ],
      { sourceUrl: "https://github.com/pagopa/dx/actions/runs/123456" },
    );

    expect(markdown).toContain(
      "Full plan output is not included in this comment.",
    );
    expect(markdown).toContain(
      "[workflow run](https://github.com/pagopa/dx/actions/runs/123456)",
    );
    expect(markdown).not.toContain("```hcl");
    expect(markdown).not.toContain(longPlanOutput);
  });

  it("omits every plan output when rendering many reports", () => {
    const repeatedPlanOutput = "x".repeat(12_000);
    const reports: Parameters<TerraformPlanMarkdownRenderer>[0] = Array.from(
      { length: 5 },
      (_, index) => ({
        modulePath: `./infra/modules/module-${index + 1}`,
        notices: [],
        planOutput: repeatedPlanOutput,
        success: true,
        summaryLine: "Plan: 1 to add, 0 to change, 0 to destroy.",
      }),
    );
    const markdown = renderTerraformPlanMarkdown(reports);
    const fullPlanBlockCount = markdown.match(/```hcl/g)?.length ?? 0;

    expect(markdown.length).toBeLessThan(65_536);
    expect(markdown).toContain(
      "Full plan output is not included in this comment.",
    );
    expect(markdown).toContain(
      "See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.",
    );
    expect(fullPlanBlockCount).toBe(0);
    expect(markdown).not.toContain(repeatedPlanOutput);
  });

  it("renders successful reports without a summary line", () => {
    const markdown = renderTerraformPlanMarkdown([
      {
        modulePath: "./infra/modules/success",
        notices: [],
        planOutput: "No changes.",
        success: true,
      },
    ]);

    expect(markdown).toBe(
      "### Terraform Plan: `./infra/modules/success` - ✅ Success\n\n> [!NOTE]\n> Full plan output is not included in this comment.\n> See the workflow run logs or downloaded Terraform plan report artifacts for the complete output.",
    );
  });
});

describe("appendPlanOutputToSummary", () => {
  let tempDirectoryPath = "";
  let summaryFilePath = "";

  beforeEach(async () => {
    tempDirectoryPath = await createTestDirectory();
    summaryFilePath = path.join(tempDirectoryPath, "step-summary.md");
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
  });

  it("appends markdown with a collapsible details block to the summary file", async () => {
    await appendPlanOutputToSummary(
      summaryFilePath,
      "/tmp/module",
      "No changes.",
    );

    const content = await fs.readFile(summaryFilePath, "utf8");

    expect(content).toContain("### Terraform Plan: `/tmp/module`");
    expect(content).toContain("<details><summary>Show Plan</summary>");
    expect(content).toContain("```\nNo changes.\n```");
    expect(content).toContain("</details>");
  });

  it("appends multiple plans to the same summary file without overwriting", async () => {
    await appendPlanOutputToSummary(
      summaryFilePath,
      "/tmp/module-a",
      "No changes.",
    );
    await appendPlanOutputToSummary(
      summaryFilePath,
      "/tmp/module-b",
      "Plan: 1 to add.",
    );

    const content = await fs.readFile(summaryFilePath, "utf8");

    expect(content).toContain("### Terraform Plan: `/tmp/module-a`");
    expect(content).toContain("### Terraform Plan: `/tmp/module-b`");
  });

  it("swallows errors when the summary file cannot be written", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const invalidPath = path.join(
      tempDirectoryPath,
      "nonexistent-dir",
      "summary.md",
    );

    await expect(
      appendPlanOutputToSummary(invalidPath, "/tmp/module", "No changes."),
    ).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "Failed to write Terraform plan output summary",
      expect.any(Error),
    );
  });
});

describe("truncateForConsoleLog", () => {
  it("returns output unchanged when it fits within maxChars", () => {
    const output = "No changes. Your infrastructure matches the configuration.";

    expect(truncateForConsoleLog(output, undefined, 100)).toBe(output);
  });

  it("returns output unchanged when length equals maxChars exactly", () => {
    const output = "x".repeat(50);

    expect(truncateForConsoleLog(output, undefined, 50)).toBe(output);
  });

  it("replaces output with summaryLine and artifact notice when too large", () => {
    const output = "x".repeat(100);
    const summaryLine = "Plan: 1 to add, 0 to change, 0 to destroy.";

    const result = truncateForConsoleLog(output, summaryLine, 50);

    expect(result).toBe(
      `${summaryLine}\n\n[Plan output truncated. See the plan report artifacts for the full output.]`,
    );
    expect(result).not.toContain("x".repeat(10));
  });

  it("falls back to a default message when summaryLine is undefined and output is too large", () => {
    const output = "x".repeat(100);

    const result = truncateForConsoleLog(output, undefined, 50);

    expect(result).toContain("No plan output available.");
  });
});
