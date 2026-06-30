import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRunCommand } = vi.hoisted(() => ({
  mockRunCommand: vi.fn(),
}));

vi.mock("../../run-command.ts", () => ({
  runCommand: mockRunCommand,
}));

import { terraformRbacPreflight } from "../rbac-preflight.ts";

let tempDirectoryPath = "";

const terraformShowResult = (plan: unknown) => ({
  exitCode: 0,
  signal: null,
  stderr: "",
  stdout: JSON.stringify(plan),
});

const successfulJsonResult = (value: unknown) => ({
  exitCode: 0,
  signal: null,
  stderr: "",
  stdout: JSON.stringify(value),
});

beforeEach(async () => {
  tempDirectoryPath = await fs.mkdtemp(
    path.join(os.tmpdir(), "dx-tasks-rbac-preflight-"),
  );
  mockRunCommand.mockReset();
});

afterEach(async () => {
  await fs.rm(tempDirectoryPath, { force: true, recursive: true });
  vi.restoreAllMocks();
});

describe("terraformRbacPreflight reports", () => {
  it("writes a skipped report when the CD principal ID is not configured", async () => {
    mockRunCommand.mockResolvedValueOnce(
      terraformShowResult({
        resource_changes: [
          {
            address: "azurerm_resource_group.example",
            change: {
              actions: ["create"],
              after: { name: "example-rg" },
              before: null,
            },
            type: "azurerm_resource_group",
          },
        ],
      }),
    );

    await expect(
      terraformRbacPreflight({
        modulePath: tempDirectoryPath,
        planFile: "tfplan",
        principalId: "",
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        summaryFile: "rbac.md",
      }),
    ).resolves.toStrictEqual({
      checkedRequirements: 0,
      missingRequirements: 0,
      skipped: true,
      unknownResources: 0,
    });

    await expect(
      fs.readFile(path.join(tempDirectoryPath, "rbac.md"), "utf8"),
    ).resolves.toContain("Terraform RBAC Preflight - skipped");
    expect(mockRunCommand).toHaveBeenCalledExactlyOnceWith(
      "terraform",
      ["show", "-json", "tfplan"],
      tempDirectoryPath,
      { TF_IN_AUTOMATION: "true" },
    );
  });

  it("passes when the CD principal has the required action", async () => {
    mockRunCommand
      .mockResolvedValueOnce(
        terraformShowResult({
          resource_changes: [
            {
              address: "azurerm_resource_group.example",
              change: {
                actions: ["create"],
                after: { name: "example-rg" },
                before: null,
              },
              type: "azurerm_resource_group",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        successfulJsonResult([
          {
            id: "assignment-id",
            roleDefinitionName: "Custom Role",
          },
        ]),
      )
      .mockResolvedValueOnce(
        successfulJsonResult([
          {
            permissions: [
              {
                actions: [
                  "Microsoft.Resources/subscriptions/resourceGroups/write",
                ],
                notActions: [],
              },
            ],
          },
        ]),
      );

    await expect(
      terraformRbacPreflight({
        modulePath: tempDirectoryPath,
        planFile: "tfplan",
        principalId: "principal-id",
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        summaryFile: "rbac.md",
      }),
    ).resolves.toStrictEqual({
      checkedRequirements: 1,
      missingRequirements: 0,
      skipped: false,
      unknownResources: 0,
    });

    await expect(
      fs.readFile(path.join(tempDirectoryPath, "rbac.md"), "utf8"),
    ).resolves.toContain("Terraform RBAC Preflight - passed");
    expect(mockRunCommand).toHaveBeenNthCalledWith(
      2,
      "az",
      [
        "role",
        "assignment",
        "list",
        "--assignee-object-id",
        "principal-id",
        "--scope",
        "/subscriptions/00000000-0000-0000-0000-000000000000",
        "--include-inherited",
        "--all",
        "--output",
        "json",
      ],
      tempDirectoryPath,
      {},
    );
  });
});

describe("terraformRbacPreflight storage scopes", () => {
  it("checks storage table permissions on the resolved storage account scope", async () => {
    mockRunCommand
      .mockResolvedValueOnce(
        terraformShowResult({
          resource_changes: [
            {
              address: "azurerm_storage_account.example",
              change: {
                actions: ["no-op"],
                after: {
                  name: "examplest",
                  resource_group_name: "example-rg",
                },
                before: {
                  id: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/old-rg/providers/Microsoft.Storage/storageAccounts/examplest",
                  name: "examplest",
                  resource_group_name: "old-rg",
                },
              },
              type: "azurerm_storage_account",
            },
            {
              address: "azurerm_storage_table.example",
              change: {
                actions: ["create"],
                after: {
                  name: "example",
                  storage_account_name: "examplest",
                },
                before: null,
              },
              type: "azurerm_storage_table",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        successfulJsonResult([
          {
            id: "assignment-id",
            roleDefinitionName: "Storage Table Data Contributor",
          },
        ]),
      )
      .mockResolvedValueOnce(
        successfulJsonResult([
          {
            permissions: [
              {
                dataActions: [
                  "Microsoft.Storage/storageAccounts/tableServices/tables/write",
                ],
                notDataActions: [],
              },
            ],
          },
        ]),
      );

    await expect(
      terraformRbacPreflight({
        modulePath: tempDirectoryPath,
        planFile: "tfplan",
        principalId: "principal-id",
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        summaryFile: "rbac.md",
      }),
    ).resolves.toStrictEqual({
      checkedRequirements: 1,
      missingRequirements: 0,
      skipped: false,
      unknownResources: 0,
    });

    expect(mockRunCommand).toHaveBeenNthCalledWith(
      2,
      "az",
      [
        "role",
        "assignment",
        "list",
        "--assignee-object-id",
        "principal-id",
        "--scope",
        "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/examplest",
        "--include-inherited",
        "--all",
        "--output",
        "json",
      ],
      tempDirectoryPath,
      {},
    );
  });
});

describe("terraformRbacPreflight failures", () => {
  it("fails when the CD principal is missing the required action", async () => {
    mockRunCommand
      .mockResolvedValueOnce(
        terraformShowResult({
          resource_changes: [
            {
              address: "azurerm_resource_group.example",
              change: {
                actions: ["create"],
                after: { name: "example-rg" },
                before: null,
              },
              type: "azurerm_resource_group",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        successfulJsonResult([
          {
            id: "assignment-id",
            roleDefinitionName: "Reader",
          },
        ]),
      )
      .mockResolvedValueOnce(
        successfulJsonResult([
          {
            permissions: [
              {
                actions: [
                  "Microsoft.Resources/subscriptions/resourceGroups/read",
                ],
                notActions: [],
              },
            ],
          },
        ]),
      );

    await expect(
      terraformRbacPreflight({
        modulePath: tempDirectoryPath,
        planFile: "tfplan",
        principalId: "principal-id",
        subscriptionId: "00000000-0000-0000-0000-000000000000",
        summaryFile: "rbac.md",
      }),
    ).rejects.toThrow("Missing 1 Azure RBAC permission(s)");

    await expect(
      fs.readFile(path.join(tempDirectoryPath, "rbac.md"), "utf8"),
    ).resolves.toContain("Terraform RBAC Preflight - failed");
  });
});
