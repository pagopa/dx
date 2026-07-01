import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

const { mockUploadPlanBundle } = vi.hoisted(() => ({
  mockUploadPlanBundle: vi.fn(),
}));

vi.mock("../plan-storage.ts", () => ({
  uploadPlanBundle: mockUploadPlanBundle,
}));

import { terraformPlanUpload } from "../plan-upload.ts";

describe("terraformPlanUpload", () => {
  beforeEach(() => {
    mockRunCommand.mockReset();
    mockUploadPlanBundle.mockReset();

    vi.stubEnv("CI", "false");
    vi.stubEnv("GITHUB_RUN_ID", "98765");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    mockRunCommand.mockResolvedValue({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: "No changes. Your infrastructure matches the configuration.",
    });
    mockUploadPlanBundle.mockResolvedValue({
      backend: {
        container: "tfstate",
        storageAccount: "dxtfstate",
        type: "azurerm",
      },
      planPath: "prod/plan-artifacts/terraform.tfstate.98765",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("throws when GITHUB_RUN_ID is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("CI", "false");

    await expect(
      terraformPlanUpload({ modulePath: "/tmp/module" }),
    ).rejects.toThrow(/GITHUB_RUN_ID/);

    expect(mockUploadPlanBundle).not.toHaveBeenCalled();
  });

  it("runs terraform plan with a fixed -out path", async () => {
    await terraformPlanUpload({ modulePath: "/tmp/module" });

    expect(mockRunCommand).toHaveBeenCalledWith(
      "terraform",
      ["plan"],
      "/tmp/module",
      expect.objectContaining({
        TF_CLI_ARGS_plan: expect.stringContaining("-out=tfplan.binary"),
      }),
    );
  });

  it("uploads the plan bundle using the same fixed plan file name", async () => {
    await terraformPlanUpload({ modulePath: "/tmp/module" });

    expect(mockUploadPlanBundle).toHaveBeenCalledWith({
      planFile: "tfplan.binary",
      runId: "98765",
      workingDirectory: "/tmp/module",
    });
  });

  it("propagates a terraform plan failure without uploading", async () => {
    mockRunCommand.mockResolvedValue({
      exitCode: 1,
      signal: null,
      stderr: "Error: invalid configuration",
      stdout: "",
    });

    await expect(
      terraformPlanUpload({ modulePath: "/tmp/module" }),
    ).rejects.toThrow(/Terraform plan exited with code 1/);

    expect(mockUploadPlanBundle).not.toHaveBeenCalled();
  });
});
