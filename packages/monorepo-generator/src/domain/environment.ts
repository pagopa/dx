import { z } from "zod/v4";

import {
  CloudAccount,
  cloudAccountSchema,
  CloudAccountService,
} from "./cloud-account.js";
import { TerraformBackend } from "./remote-backend.js";

export const environmentShort: Record<Environment["name"], string> = {
  dev: "d",
  prod: "p",
  uat: "u",
};

export const environmentSchema = z.object({
  cloudAccounts: z.array(cloudAccountSchema).min(1),
  name: z.enum(["dev", "prod", "uat"]),
  prefix: z.string().min(2).max(4),
});

export type Environment = z.infer<typeof environmentSchema>;

export type EnvironmentId = Pick<Environment, "name" | "prefix">;

export type EnvironmentInitStatus =
  | {
      initialized: false;
      issues: EnvironmentInitIssue[];
    }
  | {
      initialized: true;
    };

interface CloudAccountNotInitializedIssue {
  cloudAccount: CloudAccount;
  type: "CLOUD_ACCOUNT_NOT_INITIALIZED";
}

type EnvironmentInitIssue =
  | CloudAccountNotInitializedIssue
  | MissingRemoteBackendIssue;

interface MissingRemoteBackendIssue {
  type: "MISSING_REMOTE_BACKEND";
}

export async function getInitializationStatus(
  cloudAccountService: CloudAccountService,
  environment: Environment,
): Promise<EnvironmentInitStatus> {
  const issues: EnvironmentInitIssue[] = [];
  for (const cloudAccount of environment.cloudAccounts) {
    const initialized = await cloudAccountService.isInitialized(
      cloudAccount.id,
      environment,
    );
    if (!initialized) {
      issues.push({
        cloudAccount,
        type: "CLOUD_ACCOUNT_NOT_INITIALIZED",
      });
    }
  }
  const terraformBackend = await getTerraformBackend(
    cloudAccountService,
    environment,
  );
  if (!terraformBackend) {
    issues.push({
      type: "MISSING_REMOTE_BACKEND",
    });
  }
  if (issues.length > 0) {
    return {
      initialized: false,
      issues,
    };
  }
  return {
    initialized: true,
  };
}

export async function getTerraformBackend(
  cloudAccountService: CloudAccountService,
  environment: Environment,
): Promise<TerraformBackend | undefined> {
  for (const cloudAccount of environment.cloudAccounts) {
    const backend = await cloudAccountService.getTerraformBackend(
      cloudAccount.id,
      environment,
    );
    if (backend) {
      return backend;
    }
  }
  return undefined;
}

export async function hasUserPermissionToInitialize(
  cloudAccountService: CloudAccountService,
  environment: Environment,
): Promise<boolean> {
  for (const cloudAccount of environment.cloudAccounts) {
    const result = await cloudAccountService.hasUserPermissionToInitialize(
      cloudAccount.id,
    );
    if (!result) {
      return false;
    }
  }
  return true;
}
