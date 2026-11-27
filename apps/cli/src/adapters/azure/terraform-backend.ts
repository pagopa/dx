/**
 * Shares deterministic backend names between the placement preview and provisioning.
 */
import type { CloudAccount } from "../../domain/cloud-account.js";

import {
  type EnvironmentId,
  getEnvironmentShort,
} from "../../domain/environment.js";
import {
  type TerraformBackend,
  terraformStateContainerName,
} from "../../domain/remote-backend.js";
import { isAzureLocation, locationShort } from "./locations.js";

export const plannedTerraformBackend = (
  cloudAccount: CloudAccount,
  environment: EnvironmentId,
  domain: string,
): TerraformBackend => {
  if (
    cloudAccount.csp !== "azure" ||
    !isAzureLocation(cloudAccount.defaultLocation)
  ) {
    throw new Error(
      "An Azure account with a supported location is required to plan the backend",
    );
  }
  const env = getEnvironmentShort(environment.name);
  const location = locationShort[cloudAccount.defaultLocation];
  return {
    containerName: terraformStateContainerName(domain),
    resourceGroupName: `${environment.prefix}-${env}-${location}-tfstate-rg-01`,
    storageAccountName: `${environment.prefix}${env}${location}tfstatest01`,
    subscriptionId: cloudAccount.id,
    type: "azurerm",
  };
};
