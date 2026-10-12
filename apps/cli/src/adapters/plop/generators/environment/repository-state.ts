/**
 * Collect consent for repository state placement before spinner-driven actions.
 */
import inquirer from "inquirer";
import path from "node:path";
import { z } from "zod/v4";

import type { CloudAccountService } from "../../../../domain/cloud-account.js";
import type { RepositoryStateResult } from "../../../../domain/repository-state.js";
import type { Payload } from "./prompts.js";

import {
  getEnvironmentShort,
  getTerraformBackend,
} from "../../../../domain/environment.js";
import { isAzureLocation, locationShort } from "../../../azure/locations.js";
import {
  describeRepositoryDestination,
  readRepositoryBackend,
} from "../../../terraform/repository-backend.js";

export const collectRepositoryStateDestination = async (
  payload: Payload,
  cloudAccountService: CloudAccountService,
  nonInteractive: boolean,
  confirmed: boolean,
): Promise<RepositoryStateResult> => {
  const configured = await readRepositoryBackend(
    path.join(process.cwd(), "infra", "repository"),
  );
  if (configured) {
    return { destination: configured, status: "pending" };
  }

  const selected = payload.init?.terraformBackend?.cloudAccount;
  const discovered = await getTerraformBackend(
    cloudAccountService,
    payload.env,
  );
  const backend =
    discovered ??
    (() => {
      if (!selected || !isAzureLocation(selected.defaultLocation)) {
        throw new Error(
          "Cannot determine the repository state backend before confirmation.",
        );
      }
      const shortEnv = getEnvironmentShort(payload.env.name);
      const shortLocation = locationShort[selected.defaultLocation];
      return {
        resourceGroupName: `${payload.env.prefix}-${shortEnv}-${shortLocation}-tfstate-rg-01`,
        storageAccountName: `${payload.env.prefix}${shortEnv}${shortLocation}tfstatest01`,
        subscriptionId: selected.id,
        type: "azurerm" as const,
      };
    })();

  const destination = {
    backend,
    containerName: "terraform-state",
    key: `${payload.env.prefix}/${payload.workspace.domain}/repository.tfstate`,
  };
  const message = [
    `Use environment "${payload.env.name}" for shared repository state?`,
    describeRepositoryDestination(destination),
    "This destination is permanent for the repository, including future environments.",
    "Local state will be migrated and verified before GitHub environments are changed.",
    "If local state is missing, existing GitHub resources will be recovered using imports.",
  ].join("\n");

  if (!confirmed) {
    if (nonInteractive) {
      throw new Error(
        `${message}\nPass --yes to confirm repository state placement.`,
      );
    }
    const result = z.object({ confirm: z.boolean() }).safeParse(
      await inquirer.prompt({
        default: false,
        message,
        name: "confirm",
        type: "confirm",
      }),
    );
    if (!result.success || !result.data.confirm) {
      throw new Error(
        "Repository state placement was not confirmed. No environment actions have run.",
      );
    }
  }
  return { destination, status: "pending" };
};
