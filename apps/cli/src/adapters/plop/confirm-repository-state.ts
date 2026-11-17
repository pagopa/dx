/**
 * Confirms permanent repository placement before non-interactive generator actions.
 */
import inquirer from "inquirer";
import path from "node:path";
import { z } from "zod/v4";

import type { CloudAccountService } from "../../domain/cloud-account.js";
import type {
  InitialAnswers,
  Payload,
} from "./generators/environment/prompts.js";

import { getTerraformBackend } from "../../domain/environment.js";
import { plannedTerraformBackend } from "../azure/terraform-backend.js";
import {
  readRepositoryBackend,
  repositoryStateDestination,
} from "../terraform/repository-backend.js";

export const confirmRepositoryStatePlacement = async (
  payload: Payload,
  cloudAccountService: CloudAccountService,
  initialAnswers: InitialAnswers,
  nonInteractive: boolean,
): Promise<void> => {
  const configured = await readRepositoryBackend(
    path.join(process.cwd(), "infra", "repository"),
  );
  if (configured) {
    payload.repositoryStateDestination = configured;
    return;
  }
  const backend = payload.init?.terraformBackend
    ? plannedTerraformBackend(
        payload.init.terraformBackend.cloudAccount,
        payload.env,
      )
    : await getTerraformBackend(cloudAccountService, payload.env);
  if (!backend) {
    throw new Error(
      "Cannot resolve the repository state destination before confirmation",
    );
  }
  const destination = repositoryStateDestination(
    backend,
    payload.env.prefix,
    payload.workspace.domain,
  );
  if (initialAnswers.init?.confirm !== true) {
    if (nonInteractive) {
      throw new Error(
        "Repository state placement requires confirmation. Re-run the same `dx add environment` command with --yes.",
      );
    }
    const answer: unknown = await inquirer.prompt({
      default: false,
      message: [
        `Repository Terraform state - environment "${payload.env.name}":`,
        `Subscription: ${destination.subscriptionId}`,
        `Resource Group: ${destination.resourceGroupName}`,
        `Storage Account: ${destination.storageAccountName}`,
        `Container: ${destination.containerName}`,
        `Key: ${destination.key}`,
        "This placement is permanent for this repository, including subsequent environments.",
        "Proceed with migration or import?",
      ].join("\n"),
      name: "confirmed",
      type: "confirm",
    });
    const parsed = z.object({ confirmed: z.literal(true) }).safeParse(answer);
    if (!parsed.success) {
      throw new Error(
        "Repository state placement was not confirmed; no repository state was changed.",
        {
          cause: parsed.error,
        },
      );
    }
  }
  payload.repositoryStateDestination = destination;
};
