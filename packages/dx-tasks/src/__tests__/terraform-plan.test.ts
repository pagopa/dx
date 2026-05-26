import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TerraformPlanPayload } from "../terraform-plan.ts";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

import { terraformPlan } from "../terraform-plan.ts";

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

describe("terraformPlan", () => {
  beforeEach(() => {
    mockRunCommand.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
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

  it.each(snapshotScenarios)(
    "matches the snapshot for $name",
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
});
