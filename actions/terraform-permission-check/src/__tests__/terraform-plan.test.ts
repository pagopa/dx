/** Verifies deterministic extraction of Azure RBAC requirements from plans. */

import { describe, expect, it } from "vitest";

import { extractPlanRequirements } from "../terraform-plan.js";

const extract = (plan: unknown) =>
  extractPlanRequirements(plan, { subscriptionId: "000" });

const playgroundPlanFixture = {
  configuration: {
    root_module: {
      resources: [
        {
          address: "azurerm_role_assignment.no_permissions",
          expressions: {
            scope: {
              references: ["azurerm_resource_group.no_permissions"],
            },
          },
        },
      ],
    },
  },
  resource_changes: [
    {
      address: "azurerm_resource_group.no_permissions",
      change: {
        actions: ["create"],
        after: {
          location: "Italy North",
          name: "permissions",
        },
        before: null,
      },
      type: "azurerm_resource_group",
    },
    {
      address: "azurerm_role_assignment.no_permissions",
      change: {
        actions: ["create"],
        after: { scope: null },
        before: null,
      },
      type: "azurerm_role_assignment",
    },
    {
      address: "module.apim.azurerm_api_management.this",
      change: {
        actions: ["create"],
        after: { name: "apim", resource_group_name: "platform" },
        before: null,
      },
      type: "azurerm_api_management",
    },
    {
      address: "module.cosmos.azurerm_cosmosdb_account.this",
      change: {
        actions: ["create"],
        after: { name: "cosmos", resource_group_name: "platform" },
        before: null,
      },
      type: "azurerm_cosmosdb_account",
    },
    {
      address: "module.cosmos.azurerm_private_endpoint.sql[0]",
      change: {
        actions: ["create"],
        after: { name: "cosmos-pe", resource_group_name: "platform" },
        before: null,
      },
      type: "azurerm_private_endpoint",
    },
  ],
};

const playgroundRequirements = [
  {
    action: "Microsoft.Resources/subscriptions/resourceGroups/write",
    operation: "create",
    resourceAddress: "azurerm_resource_group.no_permissions",
    scope: "/subscriptions/000",
  },
  {
    action: "Microsoft.Authorization/roleAssignments/write",
    operation: "create",
    resourceAddress: "azurerm_role_assignment.no_permissions",
    scope: "/subscriptions/000",
  },
  {
    action: "Microsoft.ApiManagement/service/write",
    operation: "create",
    resourceAddress: "module.apim.azurerm_api_management.this",
    scope:
      "/subscriptions/000/resourceGroups/platform/providers/Microsoft.ApiManagement/service/apim",
  },
  {
    action: "Microsoft.DocumentDB/databaseAccounts/write",
    operation: "create",
    resourceAddress: "module.cosmos.azurerm_cosmosdb_account.this",
    scope:
      "/subscriptions/000/resourceGroups/platform/providers/Microsoft.DocumentDB/databaseAccounts/cosmos",
  },
  {
    action: "Microsoft.Network/privateEndpoints/write",
    operation: "create",
    resourceAddress: "module.cosmos.azurerm_private_endpoint.sql[0]",
    scope:
      "/subscriptions/000/resourceGroups/platform/providers/Microsoft.Network/privateEndpoints/cosmos-pe",
  },
];

const dataPlanePlanFixture = {
  resource_changes: [
    {
      address: "azurerm_storage_container.example",
      change: {
        actions: ["create"],
        after: {
          storage_account_id:
            "/subscriptions/000/resourceGroups/data/providers/Microsoft.Storage/storageAccounts/example",
        },
        before: null,
      },
      type: "azurerm_storage_container",
    },
    {
      address: "azurerm_storage_queue.example",
      change: {
        actions: ["create"],
        after: {
          storage_account_id:
            "/subscriptions/000/resourceGroups/data/providers/Microsoft.Storage/storageAccounts/example",
        },
        before: null,
      },
      type: "azurerm_storage_queue",
    },
    {
      address: "azurerm_storage_table.example",
      change: {
        actions: ["create"],
        after: {
          storage_account_id:
            "/subscriptions/000/resourceGroups/data/providers/Microsoft.Storage/storageAccounts/example",
        },
        before: null,
      },
      type: "azurerm_storage_table",
    },
    {
      address: "azurerm_key_vault_secret.example",
      change: {
        actions: ["create"],
        after: {
          key_vault_id:
            "/subscriptions/000/resourceGroups/data/providers/Microsoft.KeyVault/vaults/example",
        },
        before: null,
      },
      type: "azurerm_key_vault_secret",
    },
    {
      address: "azurerm_key_vault_key.example",
      change: {
        actions: ["create"],
        after: {
          key_vault_id:
            "/subscriptions/000/resourceGroups/data/providers/Microsoft.KeyVault/vaults/example",
        },
        before: null,
      },
      type: "azurerm_key_vault_key",
    },
    {
      address: "azurerm_key_vault_certificate.example",
      change: {
        actions: ["create"],
        after: {
          key_vault_id:
            "/subscriptions/000/resourceGroups/data/providers/Microsoft.KeyVault/vaults/example",
        },
        before: null,
      },
      type: "azurerm_key_vault_certificate",
    },
  ],
};

describe("extractPlanRequirements", () => {
  it("extracts role assignment writes from creates", () => {
    const result = extract({
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
    const result = extract({
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
    const result = extract({
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

  it("extracts resource group requirements at subscription scope", () => {
    const result = extract({
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
      inconclusive: [],
      requirements: [
        {
          action: "Microsoft.Resources/subscriptions/resourceGroups/write",
          operation: "create",
          resourceAddress: "azurerm_resource_group.example",
          scope: "/subscriptions/000",
        },
      ],
    });
  });

  it("marks role assignments without a known scope as inconclusive", () => {
    const result = extract({
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

  it("extracts the report fixture resource types and linked assignment scope", () => {
    const result = extract(playgroundPlanFixture);

    expect(result.inconclusive).toEqual([]);
    expect(result.requirements).toEqual(playgroundRequirements);
  });
});

describe("extractPlanRequirements data-plane resources", () => {
  it("extracts Storage and Key Vault data-plane requirements", () => {
    const result = extract(dataPlanePlanFixture);

    expect(result.inconclusive).toEqual([]);
    expect(result.requirements).toEqual([
      {
        action:
          "Microsoft.Storage/storageAccounts/blobServices/containers/write",
        operation: "create",
        plane: "storage-data",
        resourceAddress: "azurerm_storage_container.example",
        scope:
          "/subscriptions/000/resourceGroups/data/providers/Microsoft.Storage/storageAccounts/example",
      },
      {
        action: "Microsoft.Storage/storageAccounts/queueServices/queues/write",
        operation: "create",
        plane: "storage-data",
        resourceAddress: "azurerm_storage_queue.example",
        scope:
          "/subscriptions/000/resourceGroups/data/providers/Microsoft.Storage/storageAccounts/example",
      },
      {
        action: "Microsoft.Storage/storageAccounts/tableServices/tables/write",
        operation: "create",
        plane: "storage-data",
        resourceAddress: "azurerm_storage_table.example",
        scope:
          "/subscriptions/000/resourceGroups/data/providers/Microsoft.Storage/storageAccounts/example",
      },
      {
        action: "Microsoft.KeyVault/vaults/secrets/setSecret/action",
        operation: "create",
        plane: "key-vault-data",
        resourceAddress: "azurerm_key_vault_secret.example",
        scope:
          "/subscriptions/000/resourceGroups/data/providers/Microsoft.KeyVault/vaults/example",
      },
      {
        action: "Microsoft.KeyVault/vaults/keys/create/action",
        operation: "create",
        plane: "key-vault-data",
        resourceAddress: "azurerm_key_vault_key.example",
        scope:
          "/subscriptions/000/resourceGroups/data/providers/Microsoft.KeyVault/vaults/example",
      },
      {
        action: "Microsoft.KeyVault/vaults/certificates/create/action",
        operation: "create",
        plane: "key-vault-data",
        resourceAddress: "azurerm_key_vault_certificate.example",
        scope:
          "/subscriptions/000/resourceGroups/data/providers/Microsoft.KeyVault/vaults/example",
      },
    ]);
  });

  it("rejects malformed Terraform plans", () => {
    expect(() =>
      extractPlanRequirements({ resource_changes: [{ type: 42 }] }),
    ).toThrowError("Invalid Terraform plan JSON");
  });
});

describe("extractPlanRequirements selected Terrawiz resources", () => {
  it("extracts direct, nested, and parent-ID scoped ARM requirements", () => {
    const result = extract({
      resource_changes: [
        {
          address: "azurerm_container_app.example",
          change: {
            actions: ["create"],
            after: { name: "app", resource_group_name: "platform" },
            before: null,
          },
          type: "azurerm_container_app",
        },
        {
          address: "azurerm_subnet.example",
          change: {
            actions: ["create"],
            after: {
              name: "apps",
              resource_group_name: "network",
              virtual_network_name: "hub",
            },
            before: null,
          },
          type: "azurerm_subnet",
        },
        {
          address: "azurerm_servicebus_subscription.example",
          change: {
            actions: ["create"],
            after: {
              name: "consumer",
              namespace_name: "messaging",
              resource_group_name: "platform",
              topic_name: "events",
            },
            before: null,
          },
          type: "azurerm_servicebus_subscription",
        },
        {
          address: "azurerm_cdn_frontdoor_endpoint.example",
          change: {
            actions: ["create"],
            after: {
              cdn_frontdoor_profile_id:
                "/subscriptions/000/resourceGroups/platform/providers/Microsoft.Cdn/profiles/example",
              name: "public",
            },
            before: null,
          },
          type: "azurerm_cdn_frontdoor_endpoint",
        },
      ],
    });

    expect(result.inconclusive).toEqual([]);
    expect(result.requirements).toEqual([
      {
        action: "Microsoft.App/containerApps/write",
        operation: "create",
        resourceAddress: "azurerm_container_app.example",
        scope:
          "/subscriptions/000/resourceGroups/platform/providers/Microsoft.App/containerApps/app",
      },
      {
        action: "Microsoft.Network/virtualNetworks/subnets/write",
        operation: "create",
        resourceAddress: "azurerm_subnet.example",
        scope:
          "/subscriptions/000/resourceGroups/network/providers/Microsoft.Network/virtualNetworks/hub/subnets/apps",
      },
      {
        action: "Microsoft.ServiceBus/namespaces/topics/subscriptions/write",
        operation: "create",
        resourceAddress: "azurerm_servicebus_subscription.example",
        scope:
          "/subscriptions/000/resourceGroups/platform/providers/Microsoft.ServiceBus/namespaces/messaging/topics/events/subscriptions/consumer",
      },
      {
        action: "Microsoft.Cdn/profiles/afdEndpoints/write",
        operation: "create",
        resourceAddress: "azurerm_cdn_frontdoor_endpoint.example",
        scope:
          "/subscriptions/000/resourceGroups/platform/providers/Microsoft.Cdn/profiles/example/afdEndpoints/public",
      },
    ]);
  });
});
