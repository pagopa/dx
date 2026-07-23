/** Verifies deterministic extraction of Azure RBAC requirements from plans. */

import { describe, expect, it } from "vitest";

import { extractPlanRequirements } from "../terraform-plan.js";

describe("extractPlanRequirements", () => {
  it("extracts role assignment writes from creates", () => {
    const result = extractPlanRequirements({
      resource_changes: [
        {
          address: "azurerm_role_assignment.example",
          change: {
            actions: ["create"],
            after: { scope: "/subscriptions/000/resourceGroups/example" },
            before: null,
          },
          type: "azurerm_role_assignment",
        },
      ],
    });

    expect(result).toEqual({
      inconclusive: [],
      requirements: [
        {
          action: "Microsoft.Authorization/roleAssignments/write",
          operation: "create",
          resourceAddress: "azurerm_role_assignment.example",
          scope: "/subscriptions/000/resourceGroups/example",
        },
      ],
    });
  });

  it("extracts delete and write requirements from replacements", () => {
    const result = extractPlanRequirements({
      resource_changes: [
        {
          address: "azurerm_role_assignment.example",
          change: {
            actions: ["delete", "create"],
            after: { scope: "/subscriptions/000/resourceGroups/new" },
            before: { scope: "/subscriptions/000/resourceGroups/old" },
          },
          type: "azurerm_role_assignment",
        },
      ],
    });

    expect(result.requirements).toEqual([
      {
        action: "Microsoft.Authorization/roleAssignments/delete",
        operation: "delete",
        resourceAddress: "azurerm_role_assignment.example",
        scope: "/subscriptions/000/resourceGroups/old",
      },
      {
        action: "Microsoft.Authorization/roleAssignments/write",
        operation: "create",
        resourceAddress: "azurerm_role_assignment.example",
        scope: "/subscriptions/000/resourceGroups/new",
      },
    ]);
  });

  it("identifies the unresolved operation in partial replacements", () => {
    const result = extractPlanRequirements({
      resource_changes: [
        {
          address: "azurerm_role_assignment.example",
          change: {
            actions: ["delete", "create"],
            after: { scope: "/subscriptions/000/resourceGroups/new" },
            before: { scope: null },
          },
          type: "azurerm_role_assignment",
        },
      ],
    });

    expect(result.inconclusive).toEqual([
      {
        reason: "Role assignment delete scope cannot be resolved from the plan",
        resourceAddress: "azurerm_role_assignment.example",
        resourceType: "azurerm_role_assignment",
      },
    ]);
    expect(result.requirements).toEqual([
      {
        action: "Microsoft.Authorization/roleAssignments/write",
        operation: "create",
        resourceAddress: "azurerm_role_assignment.example",
        scope: "/subscriptions/000/resourceGroups/new",
      },
    ]);
  });

  it("marks unsupported resource changes as inconclusive", () => {
    const result = extractPlanRequirements({
      resource_changes: [
        {
          address: "azurerm_resource_group.example",
          change: {
            actions: ["create"],
            after: { name: "example" },
            before: null,
          },
          type: "azurerm_resource_group",
        },
      ],
    });

    expect(result).toEqual({
      inconclusive: [
        {
          reason: "Terraform resource type is not covered by this PoC",
          resourceAddress: "azurerm_resource_group.example",
          resourceType: "azurerm_resource_group",
        },
      ],
      requirements: [],
    });
  });

  it("marks role assignments without a known scope as inconclusive", () => {
    const result = extractPlanRequirements({
      resource_changes: [
        {
          address: "azurerm_role_assignment.example",
          change: {
            actions: ["create"],
            after: { scope: null },
            before: null,
          },
          type: "azurerm_role_assignment",
        },
      ],
    });

    expect(result.inconclusive).toHaveLength(1);
    expect(result.requirements).toEqual([]);
  });

  it("rejects malformed Terraform plans", () => {
    expect(() =>
      extractPlanRequirements({ resource_changes: [{ type: 42 }] }),
    ).toThrowError("Invalid Terraform plan JSON");
  });
});
