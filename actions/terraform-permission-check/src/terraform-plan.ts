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

const configurationResourceSchema = z.object({
  address: z.string().min(1),
  expressions: z
    .object({
      scope: z
        .object({
          references: z.array(z.string().min(1)).optional(),
        })
        .optional(),
    })
    .optional(),
});

interface ConfigurationModule {
  child_modules?: ConfigurationModule[];
  resources?: ConfigurationResource[];
}

type ConfigurationResource = z.infer<typeof configurationResourceSchema>;

const configurationModuleSchema: z.ZodType<ConfigurationModule> = z.lazy(() =>
  z.object({
    child_modules: z.array(configurationModuleSchema).optional(),
    resources: z.array(configurationResourceSchema).optional(),
  }),
);

export const terraformPlanSchema = z.object({
  configuration: z
    .object({ root_module: configurationModuleSchema.optional() })
    .optional(),
  resource_changes: z.array(resourceChangeSchema).optional().default([]),
});

export interface ExtractPlanRequirementsOptions {
  subscriptionId?: string;
}

export interface InconclusiveChange {
  reason: string;
  resourceAddress: string;
  resourceType: string;
}

export type PermissionPlane = "key-vault-data" | "management" | "storage-data";

export interface PermissionRequirement {
  action: string;
  operation: "create" | "delete" | "update";
  plane?: PermissionPlane;
  resourceAddress: string;
  scope: string;
}

export interface PlanRequirements {
  inconclusive: readonly InconclusiveChange[];
  requirements: readonly PermissionRequirement[];
}

type ResourceChange = z.infer<typeof resourceChangeSchema>;

interface SupportedResourceRule {
  actionNamespace: string;
  plane?: PermissionPlane;
  scope: (
    values: z.infer<typeof resourceValuesSchema>,
    subscriptionId: string,
  ) => string | undefined;
}

const getStringValue = (
  values: z.infer<typeof resourceValuesSchema>,
  key: string,
): string | undefined => {
  const value = values?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const buildResourceId = (
  subscriptionId: string,
  resourceGroupName: string,
  provider: string,
  resourceType: string,
  name: string,
): string =>
  `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/${provider}/${resourceType}/${name}`;

const getScope = (
  values: z.infer<typeof resourceValuesSchema>,
): string | undefined => {
  const scope = values?.scope;
  return typeof scope === "string" && scope.length > 0 ? scope : undefined;
};

const actionFor = (
  resourceRule: SupportedResourceRule | undefined,
  operation: PermissionRequirement["operation"],
): string =>
  `${resourceRule?.actionNamespace ?? "Microsoft.Authorization/roleAssignments"}/${operation === "delete" ? "delete" : "write"}`;

const keyVaultActionFor = (
  resource: "certificates" | "keys" | "secrets",
  operation: PermissionRequirement["operation"],
): string =>
  `Microsoft.KeyVault/vaults/${resource}/${operation === "delete" ? `delete${resource.slice(0, -1).replace(/^./u, (letter) => letter.toUpperCase())}` : resource === "secrets" ? "setSecret" : "create"}/action`;

const supportedResourceRules: Readonly<Record<string, SupportedResourceRule>> =
  {
    azurerm_api_management: {
      actionNamespace: "Microsoft.ApiManagement/service",
      scope: (values, subscriptionId) => {
        const name = getStringValue(values, "name");
        const resourceGroupName = getStringValue(values, "resource_group_name");
        return name && resourceGroupName
          ? buildResourceId(
              subscriptionId,
              resourceGroupName,
              "Microsoft.ApiManagement",
              "service",
              name,
            )
          : undefined;
      },
    },
    azurerm_cosmosdb_account: {
      actionNamespace: "Microsoft.DocumentDB/databaseAccounts",
      scope: (values, subscriptionId) => {
        const name = getStringValue(values, "name");
        const resourceGroupName = getStringValue(values, "resource_group_name");
        return name && resourceGroupName
          ? buildResourceId(
              subscriptionId,
              resourceGroupName,
              "Microsoft.DocumentDB",
              "databaseAccounts",
              name,
            )
          : undefined;
      },
    },
    azurerm_key_vault_certificate: {
      actionNamespace: keyVaultActionFor("certificates", "create"),
      plane: "key-vault-data",
      scope: (values) => getStringValue(values, "key_vault_id"),
    },
    azurerm_key_vault_key: {
      actionNamespace: keyVaultActionFor("keys", "create"),
      plane: "key-vault-data",
      scope: (values) => getStringValue(values, "key_vault_id"),
    },
    azurerm_key_vault_secret: {
      actionNamespace: keyVaultActionFor("secrets", "create"),
      plane: "key-vault-data",
      scope: (values) => getStringValue(values, "key_vault_id"),
    },
    azurerm_private_endpoint: {
      actionNamespace: "Microsoft.Network/privateEndpoints",
      scope: (values, subscriptionId) => {
        const name = getStringValue(values, "name");
        const resourceGroupName = getStringValue(values, "resource_group_name");
        return name && resourceGroupName
          ? buildResourceId(
              subscriptionId,
              resourceGroupName,
              "Microsoft.Network",
              "privateEndpoints",
              name,
            )
          : undefined;
      },
    },
    azurerm_resource_group: {
      actionNamespace: "Microsoft.Resources/subscriptions/resourceGroups",
      scope: (_values, subscriptionId) => `/subscriptions/${subscriptionId}`,
    },
    azurerm_storage_container: {
      actionNamespace:
        "Microsoft.Storage/storageAccounts/blobServices/containers",
      plane: "storage-data",
      scope: (values) => getStringValue(values, "storage_account_id"),
    },
    azurerm_storage_queue: {
      actionNamespace: "Microsoft.Storage/storageAccounts/queueServices/queues",
      plane: "storage-data",
      scope: (values) => getStringValue(values, "storage_account_id"),
    },
    azurerm_storage_table: {
      actionNamespace: "Microsoft.Storage/storageAccounts/tableServices/tables",
      plane: "storage-data",
      scope: (values) => getStringValue(values, "storage_account_id"),
    },
  };

const configurationResources = (
  module: ConfigurationModule | undefined,
): readonly ConfigurationResource[] => [
  ...(module?.resources ?? []),
  ...(module?.child_modules?.flatMap(configurationResources) ?? []),
];

const resourceScope = (
  resourceChange: ResourceChange,
  operation: PermissionRequirement["operation"],
  subscriptionId: string | undefined,
): string | undefined => {
  const values =
    operation === "delete"
      ? resourceChange.change.before
      : resourceChange.change.after;
  const resourceRule = supportedResourceRules[resourceChange.type];
  return subscriptionId
    ? resourceRule?.scope(values, subscriptionId)
    : undefined;
};

const roleAssignmentScope = (
  resourceChange: ResourceChange,
  operation: PermissionRequirement["operation"],
  subscriptionId: string | undefined,
  configurationByAddress: ReadonlyMap<string, ConfigurationResource>,
  changesByAddress: ReadonlyMap<string, ResourceChange>,
): string | undefined => {
  const directScope = getScope(
    operation === "delete"
      ? resourceChange.change.before
      : resourceChange.change.after,
  );
  if (directScope) {
    return directScope;
  }

  const reference = configurationByAddress
    .get(resourceChange.address)
    ?.expressions?.scope?.references?.at(0);
  const referencedChange = reference
    ? changesByAddress.get(reference)
    : undefined;
  return referencedChange
    ? resourceScope(referencedChange, operation, subscriptionId)
    : undefined;
};

export const extractPlanRequirements = (
  planInput: unknown,
  options: ExtractPlanRequirementsOptions = {},
): PlanRequirements => {
  const parsedPlan = terraformPlanSchema.safeParse(planInput);

  if (!parsedPlan.success) {
    throw new Error(
      `Invalid Terraform plan JSON: ${z.prettifyError(parsedPlan.error)}`,
    );
  }

  const configurationByAddress = new Map(
    configurationResources(parsedPlan.data.configuration?.root_module).map(
      (resource) => [resource.address, resource],
    ),
  );
  const changesByAddress = new Map(
    parsedPlan.data.resource_changes.map((resourceChange) => [
      resourceChange.address,
      resourceChange,
    ]),
  );

  return parsedPlan.data.resource_changes.reduce<PlanRequirements>(
    (result, resourceChange) => {
      const actionableOperations = resourceChange.change.actions.filter(
        (action): action is "create" | "delete" | "update" =>
          action === "create" || action === "delete" || action === "update",
      );

      if (actionableOperations.length === 0) {
        return result;
      }

      const resourceRule = supportedResourceRules[resourceChange.type];
      if (resourceChange.type !== "azurerm_role_assignment" && !resourceRule) {
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
            const resolvedScope =
              resourceChange.type === "azurerm_role_assignment"
                ? roleAssignmentScope(
                    resourceChange,
                    operation,
                    options.subscriptionId,
                    configurationByAddress,
                    changesByAddress,
                  )
                : resourceScope(
                    resourceChange,
                    operation,
                    options.subscriptionId,
                  );

            return resolvedScope
              ? {
                  ...operationResult,
                  requirements: [
                    ...operationResult.requirements,
                    {
                      action:
                        resourceChange.type === "azurerm_key_vault_certificate"
                          ? keyVaultActionFor("certificates", operation)
                          : resourceChange.type === "azurerm_key_vault_key"
                            ? keyVaultActionFor("keys", operation)
                            : resourceChange.type === "azurerm_key_vault_secret"
                              ? keyVaultActionFor("secrets", operation)
                              : actionFor(resourceRule, operation),
                      operation,
                      ...(resourceRule?.plane
                        ? { plane: resourceRule.plane }
                        : {}),
                      resourceAddress: resourceChange.address,
                      scope: resolvedScope,
                    },
                  ],
                }
              : {
                  ...operationResult,
                  inconclusive: [
                    ...operationResult.inconclusive,
                    {
                      reason: `${resourceChange.type === "azurerm_role_assignment" ? "Role assignment" : resourceChange.type} ${operation} scope cannot be resolved from the plan`,
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
