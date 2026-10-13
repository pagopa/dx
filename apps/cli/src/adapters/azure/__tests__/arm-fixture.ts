/**
 * Azure SDK boundary enforcing registration and preserving discoverable resources.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { blobs } from "./blob-fixture.js";

type Resource = {
  location: string;
  name: string;
  resourceGroup: string;
  type: string;
};

export const arm = {
  groups: new Map<string, { location: string }>(),
  registered: new Set<string>(),
  resources: new Map<string, Resource>(),
};

export class ManagedServiceIdentityClient {
  federatedIdentityCredentials = {
    createOrUpdate: async (
      resourceGroup: string,
      identity: string,
      name: string,
      parameters: { audiences: string[]; issuer: string; subject: string },
    ) => {
      await this.userAssignedIdentities.get(resourceGroup, identity);
      return { name, ...parameters };
    },
  };

  userAssignedIdentities = {
    get: async (resourceGroup: string, name: string) => {
      const resource = arm.resources.get(name);
      if (resource?.resourceGroup !== resourceGroup) {
        throw new Error(`Managed identity ${name} does not exist.`);
      }
      return {
        clientId: name.includes("bootstrap-ci")
          ? "00000000-0000-0000-0000-000000000002"
          : "00000000-0000-0000-0000-000000000001",
        name,
      };
    },
  };
}

export class ResourceGraphClient {
  async resources({ query }: { query: string }) {
    const type = /where type == '([^']+)'/.exec(query)?.[1];
    const expression = /where name matches regex @'([^']+)'/.exec(query)?.[1];
    if (!type || !expression) {
      throw new Error(`Unsupported fixture Resource Graph query: ${query}`);
    }

    const pattern = new RegExp(expression);
    const data = [...arm.resources.values()].filter(
      (resource) => resource.type === type && pattern.test(resource.name),
    );
    return { data, totalRecords: data.length };
  }
}

export class ResourceManagementClient {
  providers = {
    get: async (namespace: string) => ({
      registrationState: arm.registered.has(namespace)
        ? "Registered"
        : "NotRegistered",
    }),
    register: async (namespace: string) => {
      arm.registered.add(namespace);
    },
  };

  resourceGroups = {
    beginDeleteAndWait: async (name: string) => {
      for (const [id, resource] of arm.resources) {
        if (resource.resourceGroup === name) {
          await fs.rm(
            path.join(blobs.root, `${resource.name}.blob.core.windows.net`),
            {
              force: true,
              recursive: true,
            },
          );
          arm.resources.delete(id);
        }
      }
      arm.groups.delete(name);
    },
    createOrUpdate: async (name: string, parameters: { location: string }) => {
      arm.groups.set(name, { location: parameters.location });
      return { name, ...parameters };
    },
  };
}

export class StorageManagementClient {
  storageAccounts = {
    beginCreateAndWait: async (
      resourceGroup: string,
      name: string,
      parameters: { location: string },
    ) => {
      if (!arm.registered.has("Microsoft.Storage")) {
        throw new Error("Microsoft.Storage is not registered.");
      }
      if (!arm.groups.has(resourceGroup)) {
        throw new Error("Resource group is missing.");
      }
      arm.resources.set(name, {
        location: parameters.location,
        name,
        resourceGroup,
        type: "microsoft.storage/storageaccounts",
      });
      return {
        name,
        primaryEndpoints: { blob: `https://${name}.blob.core.windows.net` },
      };
    },
  };
}

export class SubscriptionClient {
  subscriptions = {
    get: async () => ({ tenantId: "tenant-dev" }),
    list: async function* () {
      yield {
        displayName: "DEV-DX",
        state: "Enabled",
        subscriptionId: "subscription-dev",
      };
    },
  };
}

export const seedInitializedSubscription = () => {
  arm.groups.clear();
  arm.resources.clear();
  arm.registered.clear();
  for (const name of [
    "Advisor",
    "AlertsManagement",
    "ApiManagement",
    "App",
    "Authorization",
    "AzureTerraform",
    "Cache",
    "Cdn",
    "ContainerInstance",
    "CostManagement",
    "DBforPostgreSQL",
    "KeyVault",
    "ServiceBus",
    "Sql",
    "Storage",
    "Web",
  ]) {
    arm.registered.add(`Microsoft.${name}`);
  }
  for (const resource of [
    {
      name: "dxditntfstatest01",
      resourceGroup: "dx-d-itn-tfstate-rg-01",
      type: "microsoft.storage/storageaccounts",
    },
    {
      name: "dx-d-itn-bootstrap-id-01",
      resourceGroup: "dx-d-itn-common-rg-01",
      type: "microsoft.managedidentity/userassignedidentities",
    },
    {
      name: "dx-d-itn-bootstrap-ci-id-01",
      resourceGroup: "dx-d-itn-common-rg-01",
      type: "microsoft.managedidentity/userassignedidentities",
    },
    {
      name: "dx-d-itn-common-kv-01",
      resourceGroup: "dx-d-itn-common-rg-01",
      type: "microsoft.keyvault/vaults",
    },
  ]) {
    arm.resources.set(resource.name, { ...resource, location: "italynorth" });
    arm.groups.set(resource.resourceGroup, { location: "italynorth" });
  }
};
