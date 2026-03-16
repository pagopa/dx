import type { TokenCredential } from "@azure/identity";

/**
 * Automatic registration of Azure resource providers required by DX infrastructure.
 *
 * This module ensures that all necessary Azure resource providers are registered
 * on a given subscription before Terraform provisioning begins, preventing
 * deployment failures on new or uninitialized subscriptions.
 */
import { ResourceManagementClient } from "@azure/arm-resources";
import { getLogger } from "@logtape/logtape";

export const REQUIRED_RESOURCE_PROVIDERS = [
  "Microsoft.Advisor",
  "Microsoft.AlertsManagement",
  "Microsoft.ApiManagement",
  "Microsoft.App",
  "Microsoft.Authorization",
  "Microsoft.AzureTerraform",
  "Microsoft.Cache",
  "Microsoft.Cdn",
  "Microsoft.ContainerInstance",
  "Microsoft.CostManagement",
  "Microsoft.DBforPostgreSQL",
  "Microsoft.KeyVault",
  "Microsoft.ServiceBus",
  "Microsoft.Sql",
  "Microsoft.Storage",
  "Microsoft.Web",
] as const;

export const registerResourceProviders = async (
  credential: TokenCredential,
  subscriptionId: string,
): Promise<void> => {
  const logger = getLogger(["dx-cli", "register-providers"]);

  const client = new ResourceManagementClient(credential, subscriptionId);

  logger.info(
    "Registering {count} resource providers on subscription {subscriptionId}",
    {
      count: REQUIRED_RESOURCE_PROVIDERS.length,
      subscriptionId,
    },
  );

  await Promise.all(
    REQUIRED_RESOURCE_PROVIDERS.map(async (namespace) => {
      await client.providers.register(namespace);
      logger.debug("Registered provider {namespace}", { namespace });
    }),
  );

  logger.info(
    "All resource providers registered on subscription {subscriptionId}",
    { subscriptionId },
  );
};
