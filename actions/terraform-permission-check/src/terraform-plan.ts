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

const resourceGroupResourceScope =
  (provider: string, resourceType: string): SupportedResourceRule["scope"] =>
  (values, subscriptionId) => {
    const name = getStringValue(values, "name");
    const resourceGroupName = getStringValue(values, "resource_group_name");
    return name && resourceGroupName
      ? buildResourceId(
          subscriptionId,
          resourceGroupName,
          provider,
          resourceType,
          name,
        )
      : undefined;
  };

const nestedResourceScope =
  (
    provider: string,
    parentResourceType: string,
    parentNameKey: string,
    resourceType: string,
    nameKey = "name",
  ): SupportedResourceRule["scope"] =>
  (values, subscriptionId) => {
    const name = getStringValue(values, nameKey);
    const parentName = getStringValue(values, parentNameKey);
    const resourceGroupName = getStringValue(values, "resource_group_name");
    return name && parentName && resourceGroupName
      ? `${buildResourceId(subscriptionId, resourceGroupName, provider, parentResourceType, parentName)}/${resourceType}/${name}`
      : undefined;
  };

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
      scope: resourceGroupResourceScope("Microsoft.ApiManagement", "service"),
    },
    azurerm_app_service_slot: {
      actionNamespace: "Microsoft.Web/sites/slots",
      scope: nestedResourceScope(
        "Microsoft.Web",
        "sites",
        "app_service_name",
        "slots",
      ),
    },
    azurerm_cdn_frontdoor_endpoint: {
      actionNamespace: "Microsoft.Cdn/profiles/afdEndpoints",
      scope: (values) => {
        const profileId = getStringValue(values, "cdn_frontdoor_profile_id");
        const name = getStringValue(values, "name");
        return profileId && name
          ? `${profileId}/afdEndpoints/${name}`
          : undefined;
      },
    },
    azurerm_cdn_frontdoor_profile: {
      actionNamespace: "Microsoft.Cdn/profiles",
      scope: resourceGroupResourceScope("Microsoft.Cdn", "profiles"),
    },
    azurerm_container_app: {
      actionNamespace: "Microsoft.App/containerApps",
      scope: resourceGroupResourceScope("Microsoft.App", "containerApps"),
    },
    azurerm_container_app_environment: {
      actionNamespace: "Microsoft.App/managedEnvironments",
      scope: resourceGroupResourceScope("Microsoft.App", "managedEnvironments"),
    },
    azurerm_cosmosdb_account: {
      actionNamespace: "Microsoft.DocumentDB/databaseAccounts",
      scope: resourceGroupResourceScope(
        "Microsoft.DocumentDB",
        "databaseAccounts",
      ),
    },
    azurerm_cosmosdb_sql_container: {
      actionNamespace:
        "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers",
      scope: (values, subscriptionId) => {
        const accountName = getStringValue(values, "account_name");
        const databaseName = getStringValue(values, "database_name");
        const name = getStringValue(values, "name");
        const resourceGroupName = getStringValue(values, "resource_group_name");
        return accountName && databaseName && name && resourceGroupName
          ? `${buildResourceId(subscriptionId, resourceGroupName, "Microsoft.DocumentDB", "databaseAccounts", accountName)}/sqlDatabases/${databaseName}/containers/${name}`
          : undefined;
      },
    },
    azurerm_cosmosdb_sql_database: {
      actionNamespace: "Microsoft.DocumentDB/databaseAccounts/sqlDatabases",
      scope: nestedResourceScope(
        "Microsoft.DocumentDB",
        "databaseAccounts",
        "account_name",
        "sqlDatabases",
      ),
    },
    azurerm_dns_cname_record: {
      actionNamespace: "Microsoft.Network/dnsZones/CNAME",
      scope: nestedResourceScope(
        "Microsoft.Network",
        "dnsZones",
        "zone_name",
        "CNAME",
      ),
    },
    azurerm_eventhub_namespace: {
      actionNamespace: "Microsoft.EventHub/namespaces",
      scope: resourceGroupResourceScope("Microsoft.EventHub", "namespaces"),
    },
    azurerm_function_app_slot: {
      actionNamespace: "Microsoft.Web/sites/slots",
      scope: nestedResourceScope(
        "Microsoft.Web",
        "sites",
        "function_app_name",
        "slots",
      ),
    },
    azurerm_key_vault: {
      actionNamespace: "Microsoft.KeyVault/vaults",
      scope: resourceGroupResourceScope("Microsoft.KeyVault", "vaults"),
    },
    azurerm_key_vault_access_policy: {
      actionNamespace: "Microsoft.KeyVault/vaults/accessPolicies",
      scope: (values) => getStringValue(values, "key_vault_id"),
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
    azurerm_linux_function_app: {
      actionNamespace: "Microsoft.Web/sites",
      scope: resourceGroupResourceScope("Microsoft.Web", "sites"),
    },
    azurerm_linux_function_app_slot: {
      actionNamespace: "Microsoft.Web/sites/slots",
      scope: nestedResourceScope(
        "Microsoft.Web",
        "sites",
        "function_app_name",
        "slots",
      ),
    },
    azurerm_linux_web_app: {
      actionNamespace: "Microsoft.Web/sites",
      scope: resourceGroupResourceScope("Microsoft.Web", "sites"),
    },
    azurerm_linux_web_app_slot: {
      actionNamespace: "Microsoft.Web/sites/slots",
      scope: nestedResourceScope(
        "Microsoft.Web",
        "sites",
        "app_service_name",
        "slots",
      ),
    },
    azurerm_network_security_group: {
      actionNamespace: "Microsoft.Network/networkSecurityGroups",
      scope: resourceGroupResourceScope(
        "Microsoft.Network",
        "networkSecurityGroups",
      ),
    },
    azurerm_postgresql_flexible_server: {
      actionNamespace: "Microsoft.DBforPostgreSQL/flexibleServers",
      scope: resourceGroupResourceScope(
        "Microsoft.DBforPostgreSQL",
        "flexibleServers",
      ),
    },
    azurerm_private_dns_a_record: {
      actionNamespace: "Microsoft.Network/privateDnsZones/A",
      scope: nestedResourceScope(
        "Microsoft.Network",
        "privateDnsZones",
        "zone_name",
        "A",
      ),
    },
    azurerm_private_endpoint: {
      actionNamespace: "Microsoft.Network/privateEndpoints",
      scope: resourceGroupResourceScope(
        "Microsoft.Network",
        "privateEndpoints",
      ),
    },
    azurerm_redis_cache: {
      actionNamespace: "Microsoft.Cache/Redis",
      scope: resourceGroupResourceScope("Microsoft.Cache", "Redis"),
    },
    azurerm_resource_group: {
      actionNamespace: "Microsoft.Resources/subscriptions/resourceGroups",
      scope: (_values, subscriptionId) => `/subscriptions/${subscriptionId}`,
    },
    azurerm_role_definition: {
      actionNamespace: "Microsoft.Authorization/roleDefinitions",
      scope: (values) => getScope(values),
    },
    azurerm_service_plan: {
      actionNamespace: "Microsoft.Web/serverfarms",
      scope: resourceGroupResourceScope("Microsoft.Web", "serverfarms"),
    },
    azurerm_servicebus_namespace: {
      actionNamespace: "Microsoft.ServiceBus/namespaces",
      scope: resourceGroupResourceScope("Microsoft.ServiceBus", "namespaces"),
    },
    azurerm_servicebus_queue: {
      actionNamespace: "Microsoft.ServiceBus/namespaces/queues",
      scope: nestedResourceScope(
        "Microsoft.ServiceBus",
        "namespaces",
        "namespace_name",
        "queues",
      ),
    },
    azurerm_servicebus_subscription: {
      actionNamespace: "Microsoft.ServiceBus/namespaces/topics/subscriptions",
      scope: (values, subscriptionId) => {
        const name = getStringValue(values, "name");
        const namespaceName = getStringValue(values, "namespace_name");
        const resourceGroupName = getStringValue(values, "resource_group_name");
        const topicName = getStringValue(values, "topic_name");
        return name && namespaceName && resourceGroupName && topicName
          ? `${buildResourceId(subscriptionId, resourceGroupName, "Microsoft.ServiceBus", "namespaces", namespaceName)}/topics/${topicName}/subscriptions/${name}`
          : undefined;
      },
    },
    azurerm_servicebus_topic: {
      actionNamespace: "Microsoft.ServiceBus/namespaces/topics",
      scope: nestedResourceScope(
        "Microsoft.ServiceBus",
        "namespaces",
        "namespace_name",
        "topics",
      ),
    },
    azurerm_storage_account: {
      actionNamespace: "Microsoft.Storage/storageAccounts",
      scope: resourceGroupResourceScope("Microsoft.Storage", "storageAccounts"),
    },
    azurerm_storage_account_customer_managed_key: {
      actionNamespace: "Microsoft.Storage/storageAccounts",
      scope: (values) => getStringValue(values, "storage_account_id"),
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
    azurerm_subnet: {
      actionNamespace: "Microsoft.Network/virtualNetworks/subnets",
      scope: nestedResourceScope(
        "Microsoft.Network",
        "virtualNetworks",
        "virtual_network_name",
        "subnets",
      ),
    },
    azurerm_subnet_network_security_group_association: {
      actionNamespace: "Microsoft.Network/virtualNetworks/subnets",
      scope: (values) => getStringValue(values, "subnet_id"),
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
