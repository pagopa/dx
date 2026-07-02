import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TerraformApplyPayload } from "../apply.ts";

import { ReportStore } from "../../report-store.ts";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

const {
  mockComputePlanPath,
  mockDeleteRemotePlanBundle,
  mockDownloadPlanBundle,
  mockReadBackendConfig,
} = vi.hoisted(() => ({
  mockComputePlanPath: vi.fn(),
  mockDeleteRemotePlanBundle: vi.fn(),
  mockDownloadPlanBundle: vi.fn(),
  mockReadBackendConfig: vi.fn(),
}));

vi.mock("../plan-storage.ts", () => ({
  computePlanPath: mockComputePlanPath,
  deleteRemotePlanBundle: mockDeleteRemotePlanBundle,
  downloadPlanBundle: mockDownloadPlanBundle,
  readBackendConfig: mockReadBackendConfig,
}));

import {
  terraformApply,
  terraformApplyReportNamespace,
  terraformApplyReportSchema,
} from "../apply.ts";

const createReports = (baseDirectoryPath: string) =>
  new ReportStore(baseDirectoryPath).register(terraformApplyReportNamespace);

type TerraformApplyMarkdownRenderer = NonNullable<
  NonNullable<typeof terraformApplyReportNamespace.renderers>["markdown"]
>;

const renderTerraformApplyMarkdown = (
  reports: Parameters<TerraformApplyMarkdownRenderer>[0],
  context: Parameters<TerraformApplyMarkdownRenderer>[1] = {},
): string => {
  const renderer = terraformApplyReportNamespace.renderers?.markdown;

  if (!renderer) {
    throw new Error("Terraform apply Markdown renderer is not registered");
  }

  return renderer(reports, context);
};

const applies = {
  changes: `azurerm_resource_group.example: Modifying... [id=/subscriptions/x/resourceGroups/example]
azurerm_resource_group.example: Modifications complete after 3s [id=/subscriptions/x/resourceGroups/example]

Apply complete! Resources: 0 added, 1 changed, 0 destroyed.`,
  error: `Error: Unsupported argument

  on ../_modules/azure/secrets.tf line 5, in resource "github_actions_secret" "codecov_token":
   5:   client_secret = "super-secret-value"

An argument named "client_secret" is not expected here.`,
  warning: `Warning: Deprecated attribute

The attribute "foo" is deprecated.

Use "bar" instead.

Apply complete! Resources: 0 added, 0 changed, 0 destroyed.`,
};

const getTerraformApplyReportPath = (
  baseDirectoryPath: string,
  modulePath: string,
): string =>
  path.join(
    baseDirectoryPath,
    ".dx-tasks",
    "terraform-apply",
    `${Buffer.from(modulePath).toString("base64url")}.json`,
  );

const createTestDirectory = async (): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), "dx-tasks-terraform-apply-"));

const readTerraformApplyReport = async (
  baseDirectoryPath: string,
  modulePath: string,
) =>
  terraformApplyReportSchema.parse(
    JSON.parse(
      await fs.readFile(
        getTerraformApplyReportPath(baseDirectoryPath, modulePath),
        "utf8",
      ),
    ),
  );

const azureBackend = {
  container: "tfstate",
  key: "prod/terraform.tfstate",
  storageAccount: "dxtfstate",
  type: "azurerm" as const,
};

// eslint-disable-next-line max-lines-per-function
describe("terraformApply", () => {
  let tempDirectoryPath = "";

  beforeEach(() => {
    mockRunCommand.mockReset();
    mockComputePlanPath.mockReset();
    mockDeleteRemotePlanBundle.mockReset();
    mockDownloadPlanBundle.mockReset();
    mockReadBackendConfig.mockReset();

    vi.stubEnv("CI", "false");
    vi.stubEnv("GITHUB_RUN_ID", "12345");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    mockReadBackendConfig.mockResolvedValue(azureBackend);
    mockComputePlanPath.mockReturnValue(
      "prod/plan-artifacts/terraform.tfstate.12345",
    );
    mockDownloadPlanBundle.mockResolvedValue(undefined);
    mockDeleteRemotePlanBundle.mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    tempDirectoryPath = await createTestDirectory();
  });

  afterEach(async () => {
    await fs.rm(tempDirectoryPath, { force: true, recursive: true });
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("throws when GITHUB_RUN_ID is not set", async () => {
    // Stub with an empty string rather than unstubbing, since GITHUB_RUN_ID
    // is a real ambient environment variable set by GitHub Actions runners
    // and unstubbing would restore that value instead of clearing it.
    vi.stubEnv("CI", "false");
    vi.stubEnv("GITHUB_RUN_ID", "");

    await expect(terraformApply({ modulePath: "/tmp/module" })).rejects.toThrow(
      /GITHUB_RUN_ID/,
    );

    expect(mockReadBackendConfig).not.toHaveBeenCalled();
  });

  it("downloads the plan bundle before applying, using the deterministic path", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: applies.changes,
    });

    await terraformApply({ modulePath: "/tmp/module" });

    expect(mockReadBackendConfig).toHaveBeenCalledWith("/tmp/module");
    expect(mockComputePlanPath).toHaveBeenCalledWith(azureBackend.key, "12345");
    expect(mockDownloadPlanBundle).toHaveBeenCalledWith({
      backend: {
        container: "tfstate",
        storageAccount: "dxtfstate",
        type: "azurerm",
      },
      planPath: "prod/plan-artifacts/terraform.tfstate.12345",
      workingDirectory: "/tmp/module",
    });
  });

  it("passes the expected non-interactive arguments to runCommand", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: applies.changes,
    });

    await terraformApply({ modulePath: "/tmp/module" });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      [
        "apply",
        "-lock-timeout=120s",
        "-input=false",
        "-no-color",
        "-auto-approve",
        "tfplan.binary",
      ],
      "/tmp/module",
      { TF_IN_AUTOMATION: "true" },
    );
  });

  it("deletes the remote plan bundle after a successful apply", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: applies.changes,
    });

    await terraformApply({ modulePath: "/tmp/module" });

    expect(mockDeleteRemotePlanBundle).toHaveBeenCalledWith({
      backend: {
        container: "tfstate",
        storageAccount: "dxtfstate",
        type: "azurerm",
      },
      planPath: "prod/plan-artifacts/terraform.tfstate.12345",
    });
  });

  it("does not delete the remote plan bundle when the apply fails", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: applies.error,
      stdout: "",
    });

    await expect(terraformApply({ modulePath: "/tmp/module" })).rejects.toThrow(
      /Terraform apply exited with code 1/,
    );

    // The bundle is intentionally retained on failure so a re-run of the same
    // workflow run's apply job can retry against the exact reviewed plan.
    expect(mockDeleteRemotePlanBundle).not.toHaveBeenCalled();
  });

  it("throws a descriptive error when the process is terminated by a signal", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: null,
      signal: "SIGTERM",
      stderr: "",
      stdout: "",
    });

    await expect(terraformApply({ modulePath: "/tmp/module" })).rejects.toThrow(
      /terminated by signal SIGTERM/,
    );
  });

  it("writes a JSON report when report is true", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: applies.changes,
    });

    const reports = createReports(tempDirectoryPath);

    await terraformApply(
      { modulePath: "/tmp/module", report: true },
      { reports },
    );

    const report = await readTerraformApplyReport(
      tempDirectoryPath,
      "/tmp/module",
    );

    expect(report.success).toBe(true);
    expect(report.summaryLine).toContain("Apply complete!");
  });

  it("does not write a report when report is false", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: applies.changes,
    });

    const reports = createReports(tempDirectoryPath);

    await terraformApply(
      { modulePath: "/tmp/module", report: false },
      { reports },
    );

    await expect(
      fs.access(getTerraformApplyReportPath(tempDirectoryPath, "/tmp/module")),
    ).rejects.toThrow();
  });

  it("marks the report as unsuccessful and rethrows when the apply fails", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: applies.error,
      stdout: "",
    });

    const reports = createReports(tempDirectoryPath);

    await expect(
      terraformApply({ modulePath: "/tmp/module", report: true }, { reports }),
    ).rejects.toThrow();

    const report = await readTerraformApplyReport(
      tempDirectoryPath,
      "/tmp/module",
    );

    expect(report.success).toBe(false);
  });
});

describe("terraformApply payload validation", () => {
  it("requires a non-empty modulePath", () => {
    const invalidPayload = { modulePath: "" } as TerraformApplyPayload;

    expect(() =>
      terraformApplyReportSchema.parse({
        applyOutput: "",
        modulePath: invalidPayload.modulePath,
        notices: [],
        success: true,
      }),
    ).toThrow();
  });
});

describe("terraformApply Markdown rendering", () => {
  it("renders a success heading with the summary line", () => {
    const markdown = renderTerraformApplyMarkdown([
      {
        applyOutput:
          "Apply complete! Resources: 0 added, 1 changed, 0 destroyed.",
        modulePath: "/tmp/module",
        notices: [],
        success: true,
        summaryLine:
          "Apply complete! Resources: 0 added, 1 changed, 0 destroyed.",
      },
    ]);

    expect(markdown).toContain("Terraform Apply: `/tmp/module` - ✅ Success");
    expect(markdown).toContain(
      "Apply complete! Resources: 0 added, 1 changed, 0 destroyed.",
    );
  });

  it("renders a failure heading with notices", () => {
    const markdown = renderTerraformApplyMarkdown([
      {
        applyOutput: "",
        modulePath: "/tmp/module",
        notices: [{ message: "Something went wrong", severity: "error" }],
        success: false,
      },
    ]);

    expect(markdown).toContain("Terraform Apply: `/tmp/module` - ❌ Failed");
    expect(markdown).toContain("> [!CAUTION]");
    expect(markdown).toContain("Something went wrong");
  });
});
