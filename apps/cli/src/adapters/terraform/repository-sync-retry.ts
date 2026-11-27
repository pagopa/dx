/**
 * Records an interrupted environment sync after repository state verification.
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

import type { RepositoryStateDestination } from "./repository-backend.js";
import type { TerraformRunner } from "./repository-state.js";

type SyncTarget = {
  destination: RepositoryStateDestination;
  environmentName: string;
  repositoryId: number;
};

const marker = (root: string) =>
  path.join(root, ".terraform", "dx-pending-environment-sync");

const fingerprint = (target: SyncTarget, configuration: string): string => {
  const { destination, environmentName, repositoryId } = target;
  return createHash("sha256")
    .update(
      JSON.stringify([
        repositoryId,
        environmentName,
        destination.subscriptionId,
        destination.resourceGroupName,
        destination.storageAccountName,
        destination.containerName,
        destination.key,
        configuration,
      ]),
    )
    .digest("hex");
};

export const recordPendingRepositorySync = async (
  root: string,
  target: SyncTarget,
  configuration: string,
): Promise<void> => {
  await fs.mkdir(path.dirname(marker(root)), { recursive: true });
  await fs.writeFile(marker(root), fingerprint(target, configuration));
};

export const clearPendingRepositorySync = (root: string): Promise<void> =>
  fs.rm(marker(root), { force: true });

export const isPendingRepositorySync = async (
  root: string,
  target: SyncTarget,
): Promise<boolean> => {
  let recorded: string;
  try {
    recorded = await fs.readFile(marker(root), "utf8");
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return false;
    }
    throw new Error("Cannot read the pending repository environment sync", {
      cause,
    });
  }
  const configuration = await fs.readFile(path.join(root, "main.tf"), "utf8");
  return recorded === fingerprint(target, configuration);
};

const syncPlanSchema = z.object({
  resource_changes: z.array(
    z.object({
      change: z.object({
        actions: z.array(z.string()),
        after: z.object({ environment: z.string().optional() }).nullable(),
      }),
      module_address: z.string().optional(),
      type: z.string(),
    }),
  ),
});

const parseSyncPlan = (content: string) => {
  try {
    return syncPlanSchema.safeParse(JSON.parse(content));
  } catch {
    throw new Error(
      "Cannot inspect the interrupted repository environment sync plan: invalid JSON.",
    );
  }
};

export const resumeRepositorySync = async (
  repositoryPath: string,
  environmentName: string,
  terraform: TerraformRunner,
): Promise<void> => {
  const planDirectory = await fs.mkdtemp(
    path.join(repositoryPath, ".dx-sync-"),
  );
  const planPath = path.join(planDirectory, "repository.tfplan");
  try {
    const plan = await terraform(["plan", "-input=false", `-out=${planPath}`]);
    if (plan.exitCode !== 0) {
      throw new Error(
        "Cannot plan the interrupted repository environment sync.",
      );
    }

    const show = await terraform(["show", "-json", planPath]);
    if (show.exitCode !== 0) {
      throw new Error(
        "Cannot inspect the interrupted repository environment sync plan.",
      );
    }
    // The full plan can contain sensitive values; never include it in errors.
    const parsed = parseSyncPlan(show.stdout);
    const environments = new Set([
      ...["app", "bootstrapper", "infra", "opex"].map(
        (root) => `${root}-${environmentName}-ci`,
      ),
      ...["app", "automation", "bootstrapper", "infra", "opex"].map(
        (root) => `${root}-${environmentName}-cd`,
      ),
    ]);
    if (
      !parsed.success ||
      parsed.data.resource_changes.some(
        ({ change: { actions, after }, module_address, type }) => {
          if (actions.length === 1 && actions[0] === "no-op") {
            return false;
          }
          return (
            actions.length !== 1 ||
            actions[0] !== "create" ||
            module_address !== "module.github_repository" ||
            (type !== "github_repository_environment" &&
              type !== "github_repository_environment_deployment_policy") ||
            !environments.has(after?.environment ?? "")
          );
        },
      )
    ) {
      throw new Error(
        "The interrupted sync plan contains changes outside the requested GitHub environments. Review and reconcile the Terraform plan before retrying.",
      );
    }
    const result = await terraform(["apply", "-input=false", planPath]);
    if (result.exitCode !== 0) {
      throw new Error(
        "Terraform could not finish the interrupted repository environment sync.",
      );
    }
  } finally {
    await fs.rm(planDirectory, { force: true, recursive: true });
  }
};
