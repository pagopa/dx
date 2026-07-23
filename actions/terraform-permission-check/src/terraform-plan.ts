/** Validates Terraform plan JSON and extracts deterministic RBAC requirements. */

import { z } from "zod";

const terraformActionSchema = z.enum([
  "create",
  "delete",
  "no-op",
  "read",
  "update",
]);

const resourceValuesSchema = z.record(z.string(), z.unknown()).nullable();

const resourceChangeSchema = z.object({
  address: z.string().min(1),
  change: z.object({
    actions: z.array(terraformActionSchema).min(1),
    after: resourceValuesSchema,
    before: resourceValuesSchema,
  }),
  type: z.string().min(1),
});

export const terraformPlanSchema = z.object({
  resource_changes: z.array(resourceChangeSchema).optional().default([]),
});

export interface InconclusiveChange {
  reason: string;
  resourceAddress: string;
  resourceType: string;
}

export interface PermissionRequirement {
  action: string;
  operation: "create" | "delete" | "update";
  resourceAddress: string;
  scope: string;
}

export interface PlanRequirements {
  inconclusive: readonly InconclusiveChange[];
  requirements: readonly PermissionRequirement[];
}

const getScope = (
  values: z.infer<typeof resourceValuesSchema>,
): string | undefined => {
  const scope = values?.scope;
  return typeof scope === "string" && scope.length > 0 ? scope : undefined;
};

export const extractPlanRequirements = (
  planInput: unknown,
): PlanRequirements => {
  const parsedPlan = terraformPlanSchema.safeParse(planInput);

  if (!parsedPlan.success) {
    throw new Error(
      `Invalid Terraform plan JSON: ${z.prettifyError(parsedPlan.error)}`,
    );
  }

  return parsedPlan.data.resource_changes.reduce<PlanRequirements>(
    (result, resourceChange) => {
      const actionableOperations = resourceChange.change.actions.filter(
        (action): action is "create" | "delete" | "update" =>
          action === "create" || action === "delete" || action === "update",
      );

      if (actionableOperations.length === 0) {
        return result;
      }

      if (resourceChange.type !== "azurerm_role_assignment") {
        return {
          ...result,
          inconclusive: [
            ...result.inconclusive,
            {
              reason: "Terraform resource type is not covered by this PoC",
              resourceAddress: resourceChange.address,
              resourceType: resourceChange.type,
            },
          ],
        };
      }

      const operationRequirements =
        actionableOperations.reduce<PlanRequirements>(
          (operationResult, operation) => {
            const scope = getScope(
              operation === "delete"
                ? resourceChange.change.before
                : resourceChange.change.after,
            );

            return scope
              ? {
                  ...operationResult,
                  requirements: [
                    ...operationResult.requirements,
                    {
                      action:
                        operation === "delete"
                          ? "Microsoft.Authorization/roleAssignments/delete"
                          : "Microsoft.Authorization/roleAssignments/write",
                      operation,
                      resourceAddress: resourceChange.address,
                      scope,
                    },
                  ],
                }
              : {
                  ...operationResult,
                  inconclusive: [
                    ...operationResult.inconclusive,
                    {
                      reason: `Role assignment ${operation} scope cannot be resolved from the plan`,
                      resourceAddress: resourceChange.address,
                      resourceType: resourceChange.type,
                    },
                  ],
                };
          },
          { inconclusive: [], requirements: [] },
        );

      return {
        inconclusive: [
          ...result.inconclusive,
          ...operationRequirements.inconclusive,
        ],
        requirements: [
          ...result.requirements,
          ...operationRequirements.requirements,
        ],
      };
    },
    { inconclusive: [], requirements: [] },
  );
};
