/** This module checks Terraform plan JSON against Azure RBAC grants for the CD identity. */

import fs from "node:fs/promises";
import path from "node:path";
import * as z from "zod/mini";

import type { ProcessResult } from "../run-command.ts";

import { runCommand } from "../run-command.ts";

const PLAN_ACTIONS = new Set(["create", "update", "delete"] as const);

type EvaluationMode = "advisory" | "strict";
interface EvaluationResult extends PermissionRequirement {
  granted: boolean;
}
type ExtraRequirementResolver = (
  resourceChange: TerraformResourceChange,
  planActions: readonly PlanAction[],
  context: RuleContext,
) => readonly PermissionRequirement[];

type PermissionPlane = "actions" | "dataActions";

interface PermissionRequirement {
  address: string;
  permission: RequiredPermission;
  planAction: PlanAction;
  scope: string;
  terraformType: string;
}

type PermissionSpec = RequiredPermission | string;

type PlanAction = "create" | "delete" | "update";

interface RequiredPermission {
  action: string;
  plane: PermissionPlane;
}

interface ResourceRule {
  create?: readonly PermissionSpec[];
  delete?: readonly PermissionSpec[];
  extra?: readonly ExtraRequirementResolver[];
  scope: ScopeResolver;
  update?: readonly PermissionSpec[];
}

interface RoleAssignment {
  id?: string;
  roleDefinitionId?: string;
  roleDefinitionName?: string;
}
interface RoleDefinition {
  permissions?: readonly RoleDefinitionPermission[];
}
interface RoleDefinitionPermission {
  actions?: readonly string[];
  dataActions?: readonly string[];
  notActions?: readonly string[];
  notDataActions?: readonly string[];
}

interface RuleContext {
  storageAccountScopesByName: ReadonlyMap<string, string>;
  subscriptionId: string;
}

type ScopeResolver = (
  resourceChange: TerraformResourceChange,
  context: RuleContext,
) => string;

interface TerraformPlan {
  resource_changes: readonly TerraformResourceChange[];
}

interface TerraformResourceChange {
  address: string;
  change: {
    actions: readonly string[];
    after?: unknown;
    before?: unknown;
  };
  type: string;
}

export const payloadSchema = z.object({
  mode: z._default(
    z.union([z.literal("advisory"), z.literal("strict")]),
    "advisory",
  ),
  modulePath: z.string().check(z.minLength(1)),
  planFile: z.string().check(z.minLength(1)),
  principalId: z._default(z.string(), ""),
  subscriptionId: z.optional(z.string().check(z.minLength(1))),
  summaryFile: z.optional(z.string().check(z.minLength(1))),
});

export interface TerraformRbacPreflightPayload {
  mode?: EvaluationMode;
  modulePath: string;
  planFile: string;
  principalId?: string;
  subscriptionId?: string;
  summaryFile?: string;
}

export interface TerraformRbacPreflightResult {
  checkedRequirements: number;
  missingRequirements: number;
  skipped: boolean;
  unknownResources: number;
}

function dataActions(
  actions: readonly string[],
): readonly RequiredPermission[] {
  return actions.map((action) => ({ action, plane: "dataActions" }));
}

const RULES: Record<string, ResourceRule> = {
  azurerm_container_app: {
    create: ["Microsoft.App/containerApps/write"],
    delete: ["Microsoft.App/containerApps/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.App/containerApps/write"],
  },
  azurerm_container_app_environment: {
    create: ["Microsoft.App/managedEnvironments/write"],
    delete: ["Microsoft.App/managedEnvironments/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.App/managedEnvironments/write"],
  },
  azurerm_container_app_job: {
    create: ["Microsoft.App/jobs/write"],
    delete: ["Microsoft.App/jobs/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.App/jobs/write"],
  },
  azurerm_key_vault_certificate: {
    create: dataActions(["Microsoft.KeyVault/vaults/certificates/write"]),
    delete: dataActions(["Microsoft.KeyVault/vaults/certificates/delete"]),
    scope: keyVaultScope,
    update: dataActions(["Microsoft.KeyVault/vaults/certificates/write"]),
  },
  azurerm_key_vault_key: {
    create: dataActions(["Microsoft.KeyVault/vaults/keys/write"]),
    delete: dataActions(["Microsoft.KeyVault/vaults/keys/delete"]),
    scope: keyVaultScope,
    update: dataActions(["Microsoft.KeyVault/vaults/keys/write"]),
  },
  azurerm_key_vault_secret: {
    create: dataActions(["Microsoft.KeyVault/vaults/secrets/write"]),
    delete: dataActions(["Microsoft.KeyVault/vaults/secrets/delete"]),
    scope: keyVaultScope,
    update: dataActions(["Microsoft.KeyVault/vaults/secrets/write"]),
  },
  azurerm_linux_web_app: {
    create: ["Microsoft.Web/sites/write"],
    delete: ["Microsoft.Web/sites/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.Web/sites/write"],
  },
  azurerm_private_dns_a_record: privateDnsRecordRule("A"),
  azurerm_private_dns_aaaa_record: privateDnsRecordRule("AAAA"),
  azurerm_private_dns_cname_record: privateDnsRecordRule("CNAME"),
  azurerm_private_dns_mx_record: privateDnsRecordRule("MX"),
  azurerm_private_dns_ptr_record: privateDnsRecordRule("PTR"),
  azurerm_private_dns_srv_record: privateDnsRecordRule("SRV"),
  azurerm_private_dns_txt_record: privateDnsRecordRule("TXT"),
  azurerm_private_dns_zone: {
    create: ["Microsoft.Network/privateDnsZones/write"],
    delete: ["Microsoft.Network/privateDnsZones/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.Network/privateDnsZones/write"],
  },
  azurerm_private_endpoint: {
    create: [
      "Microsoft.Network/privateEndpoints/write",
      "Microsoft.Network/privateEndpoints/privateDnsZoneGroups/write",
    ],
    delete: [
      "Microsoft.Network/privateEndpoints/delete",
      "Microsoft.Network/privateEndpoints/privateDnsZoneGroups/delete",
    ],
    extra: [privateEndpointSubnetJoin, privateEndpointDnsZoneJoin],
    scope: resourceGroupScope,
    update: [
      "Microsoft.Network/privateEndpoints/write",
      "Microsoft.Network/privateEndpoints/privateDnsZoneGroups/write",
    ],
  },
  azurerm_resource_group: {
    create: ["Microsoft.Resources/subscriptions/resourceGroups/write"],
    delete: ["Microsoft.Resources/subscriptions/resourceGroups/delete"],
    scope: subscriptionScope,
    update: ["Microsoft.Resources/subscriptions/resourceGroups/write"],
  },
  azurerm_role_assignment: {
    create: ["Microsoft.Authorization/roleAssignments/write"],
    delete: ["Microsoft.Authorization/roleAssignments/delete"],
    scope: roleAssignmentTargetScope,
    update: ["Microsoft.Authorization/roleAssignments/write"],
  },
  azurerm_service_plan: {
    create: ["Microsoft.Web/serverFarms/write"],
    delete: ["Microsoft.Web/serverFarms/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.Web/serverFarms/write"],
  },
  azurerm_static_web_app: {
    create: ["Microsoft.Web/staticSites/write"],
    delete: ["Microsoft.Web/staticSites/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.Web/staticSites/write"],
  },
  azurerm_storage_account: {
    create: ["Microsoft.Storage/storageAccounts/write"],
    delete: ["Microsoft.Storage/storageAccounts/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.Storage/storageAccounts/write"],
  },
  azurerm_storage_blob: {
    create: dataActions([
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write",
    ]),
    delete: dataActions([
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
    ]),
    scope: storageAccountScope,
    update: dataActions([
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write",
    ]),
  },
  azurerm_storage_container: {
    create: dataActions([
      "Microsoft.Storage/storageAccounts/blobServices/containers/write",
    ]),
    delete: dataActions([
      "Microsoft.Storage/storageAccounts/blobServices/containers/delete",
    ]),
    scope: storageAccountScope,
    update: dataActions([
      "Microsoft.Storage/storageAccounts/blobServices/containers/write",
    ]),
  },
  azurerm_storage_queue: {
    create: dataActions([
      "Microsoft.Storage/storageAccounts/queueServices/queues/write",
    ]),
    delete: dataActions([
      "Microsoft.Storage/storageAccounts/queueServices/queues/delete",
    ]),
    scope: storageAccountScope,
    update: dataActions([
      "Microsoft.Storage/storageAccounts/queueServices/queues/write",
    ]),
  },
  azurerm_storage_table: {
    create: dataActions([
      "Microsoft.Storage/storageAccounts/tableServices/tables/write",
    ]),
    delete: dataActions([
      "Microsoft.Storage/storageAccounts/tableServices/tables/delete",
    ]),
    scope: storageAccountScope,
    update: dataActions([
      "Microsoft.Storage/storageAccounts/tableServices/tables/write",
    ]),
  },
  azurerm_windows_web_app: {
    create: ["Microsoft.Web/sites/write"],
    delete: ["Microsoft.Web/sites/delete"],
    scope: resourceGroupScope,
    update: ["Microsoft.Web/sites/write"],
  },
};

function privateDnsRecordRule(recordType: string): ResourceRule {
  return {
    create: [`Microsoft.Network/privateDnsZones/${recordType}/write`],
    delete: [`Microsoft.Network/privateDnsZones/${recordType}/delete`],
    scope: privateDnsZoneScope,
    update: [`Microsoft.Network/privateDnsZones/${recordType}/write`],
  };
}

const readPlan = async (
  modulePath: string,
  planFile: string,
): Promise<TerraformPlan> => {
  const result = await runCommand(
    "terraform",
    ["show", "-json", planFile],
    modulePath,
    { TF_IN_AUTOMATION: "true" },
  );
  ensureCommandSucceeded("terraform show", result);

  const parsedPlan: unknown = JSON.parse(result.stdout);
  if (!isTerraformPlan(parsedPlan)) {
    throw new Error(
      "Invalid Terraform plan JSON: resource_changes must be an array",
    );
  }

  return parsedPlan;
};

const isTerraformPlan = (value: unknown): value is TerraformPlan =>
  typeof value === "object" &&
  value !== null &&
  "resource_changes" in value &&
  Array.isArray(value.resource_changes);

const buildRequiredPermissions = (
  plan: TerraformPlan,
  context: Pick<RuleContext, "subscriptionId">,
): {
  requirements: readonly PermissionRequirement[];
  unknownResources: readonly TerraformResourceChange[];
} => {
  const ruleContext = {
    ...context,
    storageAccountScopesByName: buildStorageAccountScopesByName(plan, context),
  };

  return plan.resource_changes.reduce(
    (result, resourceChange) => {
      if (!isAzureResourceChange(resourceChange)) {
        return result;
      }

      const actions = resourceChange.change.actions.filter(isPlanAction);
      if (actions.length === 0) {
        return result;
      }

      const rule = RULES[resourceChange.type];
      if (!rule) {
        const inferred = inferFromExistingAzureId(resourceChange, actions);
        return inferred.length > 0
          ? {
              ...result,
              requirements: [...result.requirements, ...inferred],
            }
          : {
              ...result,
              unknownResources: [...result.unknownResources, resourceChange],
            };
      }

      const primaryScope = rule.scope(resourceChange, ruleContext);
      const primaryRequirements = primaryScope
        ? requirementsForRule(resourceChange, actions, rule, primaryScope)
        : [];
      const extraRequirements = (rule.extra ?? []).flatMap((resolver) =>
        resolver(resourceChange, actions, ruleContext),
      );

      return primaryScope ||
        primaryRequirements.length + extraRequirements.length > 0
        ? {
            ...result,
            requirements: [
              ...result.requirements,
              ...primaryRequirements,
              ...extraRequirements,
            ],
          }
        : {
            ...result,
            unknownResources: [...result.unknownResources, resourceChange],
          };
    },
    {
      requirements: [] as readonly PermissionRequirement[],
      unknownResources: [] as readonly TerraformResourceChange[],
    },
  );
};

const isAzureResourceChange = (
  resourceChange: TerraformResourceChange,
): boolean =>
  resourceChange.type.startsWith("azurerm_") &&
  Array.isArray(resourceChange.change.actions);

const isPlanAction = (action: string): action is PlanAction =>
  PLAN_ACTIONS.has(action as PlanAction);

const requirementsForRule = (
  resourceChange: TerraformResourceChange,
  planActions: readonly PlanAction[],
  rule: ResourceRule,
  scope: string,
): readonly PermissionRequirement[] =>
  planActions.flatMap((planAction) =>
    normalizeActions(rule[planAction] ?? []).map((permission) => ({
      address: resourceChange.address,
      permission,
      planAction,
      scope: normalizeScope(scope),
      terraformType: resourceChange.type,
    })),
  );

const normalizeActions = (
  actions: readonly PermissionSpec[],
): readonly RequiredPermission[] =>
  actions.map((action) =>
    typeof action === "string" ? { action, plane: "actions" } : action,
  );

function keyVaultScope(
  resourceChange: TerraformResourceChange,
  context: RuleContext,
): string {
  const keyVaultId =
    valueAt(resourceChange.change.after, "key_vault_id") ??
    valueAt(resourceChange.change.before, "key_vault_id");
  if (
    typeof keyVaultId === "string" &&
    keyVaultId.startsWith("/subscriptions/")
  ) {
    return keyVaultId;
  }
  return resourceGroupScope(resourceChange, context);
}

function privateDnsZoneScope(
  resourceChange: TerraformResourceChange,
  context: RuleContext,
): string {
  const zoneName =
    valueAt(resourceChange.change.after, "zone_name") ??
    valueAt(resourceChange.change.before, "zone_name");
  const resourceGroupName =
    valueAt(resourceChange.change.after, "resource_group_name") ??
    valueAt(resourceChange.change.before, "resource_group_name");

  if (
    typeof zoneName !== "string" ||
    zoneName.length === 0 ||
    typeof resourceGroupName !== "string" ||
    resourceGroupName.length === 0
  ) {
    return resourceGroupScope(resourceChange, context);
  }

  return `/subscriptions/${context.subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Network/privateDnsZones/${zoneName}`;
}

function privateEndpointDnsZoneJoin(
  resourceChange: TerraformResourceChange,
  planActions: readonly PlanAction[],
): readonly PermissionRequirement[] {
  if (!planActions.some((action) => ["create", "update"].includes(action))) {
    return [];
  }

  return privateDnsZoneIds(resourceChange).map((zoneId) => ({
    address: resourceChange.address,
    permission: {
      action: "Microsoft.Network/privateDnsZones/join/action",
      plane: "actions",
    },
    planAction: "create",
    scope: normalizeScope(zoneId),
    terraformType: resourceChange.type,
  }));
}

function privateEndpointSubnetJoin(
  resourceChange: TerraformResourceChange,
  planActions: readonly PlanAction[],
): readonly PermissionRequirement[] {
  if (!planActions.some((action) => ["create", "update"].includes(action))) {
    return [];
  }

  const subnetId =
    valueAt(resourceChange.change.after, "subnet_id") ??
    valueAt(resourceChange.change.before, "subnet_id");

  return typeof subnetId === "string" && subnetId.startsWith("/subscriptions/")
    ? [
        {
          address: resourceChange.address,
          permission: {
            action: "Microsoft.Network/virtualNetworks/subnets/join/action",
            plane: "actions",
          },
          planAction: "create",
          scope: normalizeScope(subnetId),
          terraformType: resourceChange.type,
        },
      ]
    : [];
}

function resourceGroupScope(
  resourceChange: TerraformResourceChange,
  context: RuleContext,
): string {
  const existingId = valueAt(resourceChange.change.before, "id");
  if (
    typeof existingId === "string" &&
    existingId.startsWith("/subscriptions/")
  ) {
    return resourceGroupScopeFromId(existingId) || existingId;
  }

  const resourceGroupName =
    valueAt(resourceChange.change.after, "resource_group_name") ??
    valueAt(resourceChange.change.before, "resource_group_name");

  return typeof resourceGroupName === "string" && resourceGroupName.length > 0
    ? `/subscriptions/${context.subscriptionId}/resourceGroups/${resourceGroupName}`
    : "";
}

function roleAssignmentTargetScope(
  resourceChange: TerraformResourceChange,
): string {
  const scope =
    valueAt(resourceChange.change.after, "scope") ??
    valueAt(resourceChange.change.before, "scope") ??
    "";

  return typeof scope === "string" ? scope : "";
}

function storageAccountScope(
  resourceChange: TerraformResourceChange,
  context: RuleContext,
): string {
  const storageAccountId =
    valueAt(resourceChange.change.after, "storage_account_id") ??
    valueAt(resourceChange.change.before, "storage_account_id");
  if (
    typeof storageAccountId === "string" &&
    storageAccountId.startsWith("/subscriptions/")
  ) {
    return storageAccountId;
  }

  const storageAccountName =
    valueAt(resourceChange.change.after, "storage_account_name") ??
    valueAt(resourceChange.change.before, "storage_account_name");
  if (typeof storageAccountName === "string" && storageAccountName.length > 0) {
    const resolvedScope = context.storageAccountScopesByName.get(
      storageAccountName.toLowerCase(),
    );
    if (resolvedScope) {
      return resolvedScope;
    }
  }

  return resourceGroupScope(resourceChange, context);
}

const buildStorageAccountScopesByName = (
  plan: TerraformPlan,
  context: Pick<RuleContext, "subscriptionId">,
): ReadonlyMap<string, string> =>
  plan.resource_changes.reduce((scopes, resourceChange) => {
    if (resourceChange.type !== "azurerm_storage_account") {
      return scopes;
    }

    const afterScope = storageAccountScopeFromAttributes(
      resourceChange.change.after,
      context.subscriptionId,
    );
    if (afterScope) {
      return new Map(scopes).set(afterScope.name.toLowerCase(), afterScope.id);
    }

    const beforeScope = storageAccountScopeFromAttributes(
      resourceChange.change.before,
      context.subscriptionId,
    );
    return beforeScope
      ? new Map(scopes).set(beforeScope.name.toLowerCase(), beforeScope.id)
      : scopes;
  }, new Map<string, string>());

const storageAccountScopeFromAttributes = (
  attributes: unknown,
  subscriptionId: string,
): undefined | { id: string; name: string } => {
  const name = valueAt(attributes, "name");
  if (typeof name !== "string" || name.length === 0) {
    return undefined;
  }

  const id = valueAt(attributes, "id");
  if (typeof id === "string" && id.startsWith("/subscriptions/")) {
    return { id: normalizeScope(id), name };
  }

  const resourceGroupName = valueAt(attributes, "resource_group_name");
  return typeof resourceGroupName === "string" && resourceGroupName.length > 0
    ? {
        id: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${name}`,
        name,
      }
    : undefined;
};

function subscriptionScope(
  _resourceChange: TerraformResourceChange,
  context: RuleContext,
): string {
  return `/subscriptions/${context.subscriptionId}`;
}

const privateDnsZoneIds = (
  resourceChange: TerraformResourceChange,
): readonly string[] => {
  const zoneGroups =
    valueAt(resourceChange.change.after, "private_dns_zone_group") ??
    valueAt(resourceChange.change.before, "private_dns_zone_group") ??
    [];

  return Array.isArray(zoneGroups)
    ? zoneGroups.flatMap((zoneGroup: unknown) => {
        const zoneIds = valueAt(zoneGroup, "private_dns_zone_ids");

        return Array.isArray(zoneIds)
          ? zoneIds.filter(
              (zoneId): zoneId is string =>
                typeof zoneId === "string" &&
                zoneId.startsWith("/subscriptions/"),
            )
          : [];
      })
    : [];
};

const inferFromExistingAzureId = (
  resourceChange: TerraformResourceChange,
  planActions: readonly PlanAction[],
): readonly PermissionRequirement[] => {
  const id =
    valueAt(resourceChange.change.before, "id") ??
    valueAt(resourceChange.change.after, "id");
  if (typeof id !== "string" || !id.startsWith("/subscriptions/")) {
    return [];
  }

  const resourceType = azureResourceTypeFromId(id);
  if (!resourceType) {
    return [];
  }

  return planActions
    .filter((action) => ["delete", "update"].includes(action))
    .map((planAction) => ({
      address: resourceChange.address,
      permission: {
        action: `${resourceType}/${planAction === "delete" ? "delete" : "write"}`,
        plane: "actions",
      },
      planAction,
      scope: normalizeScope(id),
      terraformType: resourceChange.type,
    }));
};

const azureResourceTypeFromId = (id: string): string => {
  const segments = id.split("/").filter(Boolean);
  const providerIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "providers",
  );
  if (providerIndex === -1 || providerIndex + 2 >= segments.length) {
    return "";
  }

  const providerNamespace = segments[providerIndex + 1];
  const typeSegments: string[] = [];
  for (let index = providerIndex + 2; index < segments.length; index += 2) {
    const typeSegment = segments[index];
    if (typeSegment) {
      typeSegments.push(typeSegment);
    }
  }

  return `${providerNamespace}/${typeSegments.join("/")}`;
};

const resourceGroupScopeFromId = (id: string): string => {
  const segments = id.split("/").filter(Boolean);
  const subscriptionIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "subscriptions",
  );
  const resourceGroupIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "resourcegroups",
  );

  if (
    subscriptionIndex === -1 ||
    resourceGroupIndex === -1 ||
    !segments[subscriptionIndex + 1] ||
    !segments[resourceGroupIndex + 1]
  ) {
    return "";
  }

  return `/subscriptions/${segments[subscriptionIndex + 1]}/resourceGroups/${segments[resourceGroupIndex + 1]}`;
};

const valueAt = (value: unknown, pathExpression: string): unknown => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return pathExpression.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[segment];
  }, value);
};

const evaluatePermissions = async (
  requirements: readonly PermissionRequirement[],
  principalId: string,
  modulePath: string,
): Promise<readonly EvaluationResult[]> => {
  const groupedRequirements = groupByScope(requirements);
  const roleDefinitionCache = new Map<string, RoleDefinition>();

  const evaluated: EvaluationResult[] = [];
  for (const [scope, scopeRequirements] of groupedRequirements.entries()) {
    const assignments = await listRoleAssignments(
      principalId,
      scope,
      modulePath,
    );
    const roleDefinitions = await Promise.all(
      assignments.map((assignment) =>
        readRoleDefinition(assignment, roleDefinitionCache, modulePath),
      ),
    );

    evaluated.push(
      ...scopeRequirements.map((requirement) => ({
        ...requirement,
        granted: isPermissionGranted(requirement.permission, roleDefinitions),
      })),
    );
  }

  return evaluated;
};

const groupByScope = (
  requirements: readonly PermissionRequirement[],
): Map<string, readonly PermissionRequirement[]> =>
  requirements.reduce((groups, requirement) => {
    const scope = normalizeScope(requirement.scope);
    const existing = groups.get(scope) ?? [];
    groups.set(scope, [...existing, requirement]);
    return groups;
  }, new Map<string, readonly PermissionRequirement[]>());

const listRoleAssignments = async (
  principalId: string,
  scope: string,
  modulePath: string,
): Promise<readonly RoleAssignment[]> =>
  runJsonCommand<RoleAssignment[]>(
    "az",
    [
      "role",
      "assignment",
      "list",
      "--assignee-object-id",
      principalId,
      "--scope",
      scope,
      "--include-inherited",
      "--all",
      "--output",
      "json",
    ],
    modulePath,
  );

const readRoleDefinition = async (
  assignment: RoleAssignment,
  cache: Map<string, RoleDefinition>,
  modulePath: string,
): Promise<RoleDefinition> => {
  const roleDefinitionKey =
    assignment.roleDefinitionId ?? assignment.roleDefinitionName;
  const roleDefinitionLookup =
    assignment.roleDefinitionName ?? assignment.roleDefinitionId;
  if (!roleDefinitionKey) {
    throw new Error(
      `Role assignment ${assignment.id ?? "<unknown>"} has no role definition reference`,
    );
  }
  if (!roleDefinitionLookup) {
    throw new Error(
      `Role assignment ${assignment.id ?? "<unknown>"} has no role definition lookup value`,
    );
  }

  const cacheKey = roleDefinitionKey.toLowerCase();
  const cachedDefinition = cache.get(cacheKey);
  if (cachedDefinition) {
    return cachedDefinition;
  }

  const definitions = await runJsonCommand<RoleDefinition[]>(
    "az",
    [
      "role",
      "definition",
      "list",
      "--name",
      roleDefinitionLookup,
      "--output",
      "json",
    ],
    modulePath,
  );
  const definition = definitions[0];
  if (!definition) {
    throw new Error(`Unable to read role definition ${roleDefinitionKey}`);
  }

  cache.set(cacheKey, definition);
  return definition;
};

const runJsonCommand = async <T>(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<T> => {
  const result = await runCommand(command, [...args], cwd, {});
  ensureCommandSucceeded(`${command} ${args.join(" ")}`, result);

  return JSON.parse(result.stdout) as T;
};

const ensureCommandSucceeded = (
  command: string,
  result: ProcessResult,
): void => {
  if (result.signal) {
    throw new Error(`${command} terminated by signal ${result.signal}`);
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `${command} exited with code ${result.exitCode}: ${result.stderr.trim()}`,
    );
  }
};

const isPermissionGranted = (
  permission: RequiredPermission,
  roleDefinitions: readonly RoleDefinition[],
): boolean =>
  roleDefinitions.some((roleDefinition) =>
    (roleDefinition.permissions ?? []).some((rolePermission) => {
      const allowed = rolePermission[permission.plane] ?? [];
      const denied =
        permission.plane === "dataActions"
          ? (rolePermission.notDataActions ?? [])
          : (rolePermission.notActions ?? []);

      return (
        allowed.some((pattern) =>
          matchesAzureAction(pattern, permission.action),
        ) &&
        !denied.some((pattern) =>
          matchesAzureAction(pattern, permission.action),
        )
      );
    }),
  );

const matchesAzureAction = (pattern: string, action: string): boolean => {
  const escapedPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*");
  return new RegExp(`^${escapedPattern}$`, "i").test(action);
};

const normalizeScope = (scope: string): string => scope.replace(/\/+$/, "");

const buildSummary = ({
  evaluated,
  mode,
  principalId,
  unknownResources,
}: {
  evaluated: readonly EvaluationResult[];
  mode: EvaluationMode;
  principalId: string;
  unknownResources: readonly TerraformResourceChange[];
}): string => {
  if (!principalId) {
    return [
      "### Terraform RBAC Preflight - skipped",
      "",
      "`INFRA_CD_PRINCIPAL_ID` is not configured in the CI GitHub Environment.",
      "Upgrade `azure_github_environment_bootstrap` and apply the bootstrap changes to enable PR-time RBAC checks.",
      "",
    ].join("\n");
  }

  const missing = evaluated.filter((requirement) => !requirement.granted);
  const status = missing.length > 0 ? "failed" : "passed";
  const lines = [`### Terraform RBAC Preflight - ${status}`, ""];

  if (missing.length === 0) {
    lines.push(
      `Checked ${evaluated.length} Azure RBAC requirement(s) for principal \`${principalId}\`.`,
      "",
    );
  } else {
    lines.push(
      `The CD principal \`${principalId}\` is missing ${missing.length} permission(s).`,
      "",
      "| Terraform resource | Scope | Required permission |",
      "| --- | --- | --- |",
      ...missing.map(
        (requirement) =>
          `| \`${requirement.address}\` | \`${requirement.scope}\` | \`${requirement.permission.action}\` (${requirement.permission.plane}) |`,
      ),
      "",
    );
  }

  if (unknownResources.length > 0) {
    lines.push(
      "<details>",
      "<summary>Resources not covered by the RBAC preflight mapping</summary>",
      "",
      "| Terraform resource | Type | Plan actions |",
      "| --- | --- | --- |",
      ...unknownResources.map(
        (resource) =>
          `| \`${resource.address}\` | \`${resource.type}\` | \`${resource.change.actions.join(", ")}\` |`,
      ),
      "",
      mode === "strict"
        ? "Strict mode fails when unknown Azure resources are present."
        : "Advisory mode reports unknown resources without blocking the plan.",
      "",
      "</details>",
      "",
    );
  }

  if (missing.length > 0) {
    lines.push(
      "Suggested remediation: update the bootstrap role assignments or the DX custom role bundle before merging this PR.",
      "",
    );
  }

  return lines.join("\n");
};

const writeSummary = async (
  modulePath: string,
  summaryFile: string | undefined,
  summary: string,
): Promise<void> => {
  if (!summaryFile) {
    console.log(summary);
    return;
  }

  const summaryPath = path.isAbsolute(summaryFile)
    ? summaryFile
    : path.join(modulePath, summaryFile);
  await fs.writeFile(summaryPath, summary, "utf8");
};

export async function terraformRbacPreflight({
  mode = "advisory",
  modulePath,
  planFile,
  principalId = "",
  subscriptionId = process.env["ARM_SUBSCRIPTION_ID"],
  summaryFile,
}: TerraformRbacPreflightPayload): Promise<TerraformRbacPreflightResult> {
  if (!subscriptionId) {
    throw new Error(
      "subscriptionId is required or ARM_SUBSCRIPTION_ID must be set",
    );
  }

  const plan = await readPlan(modulePath, planFile);
  const { requirements, unknownResources } = buildRequiredPermissions(plan, {
    subscriptionId,
  });

  if (!principalId) {
    const summary = buildSummary({
      evaluated: [],
      mode,
      principalId,
      unknownResources,
    });
    await writeSummary(modulePath, summaryFile, summary);
    if (mode === "strict") {
      throw new Error("INFRA_CD_PRINCIPAL_ID is required in strict mode");
    }

    return {
      checkedRequirements: 0,
      missingRequirements: 0,
      skipped: true,
      unknownResources: unknownResources.length,
    };
  }

  const evaluated = await evaluatePermissions(
    requirements,
    principalId,
    modulePath,
  );
  const missing = evaluated.filter((requirement) => !requirement.granted);
  const summary = buildSummary({
    evaluated,
    mode,
    principalId,
    unknownResources,
  });

  await writeSummary(modulePath, summaryFile, summary);

  if (missing.length > 0) {
    throw new Error(`Missing ${missing.length} Azure RBAC permission(s)`);
  }

  if (mode === "strict" && unknownResources.length > 0) {
    throw new Error(
      `Strict mode found ${unknownResources.length} unmapped Azure resource(s)`,
    );
  }

  return {
    checkedRequirements: evaluated.length,
    missingRequirements: missing.length,
    skipped: false,
    unknownResources: unknownResources.length,
  };
}
