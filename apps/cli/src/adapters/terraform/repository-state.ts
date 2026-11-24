/**
 * Moves the Terraform state of infra/repository to the shared Azure backend.
 *
 * `dx init` leaves that state on the local disk. The first `dx add
 * environment` calls ensureRemoteRepositoryState to make it remote:
 *
 * - backend configured, no local state: verify a clean plan (`already-remote`);
 * - local state: copied to the backend with `terraform init -migrate-state`,
 *   verified with a clean plan, then deleted (`migrated`);
 * - no local state but state already in the backend: reused (`already-remote`);
 * - no state anywhere (for example, a new device): the GitHub objects of the
 *   repository module are imported into the backend (`imported`).
 *
 * Terraform copies state over an existing destination without asking, so the
 * caller holds a migration lock around the destination check and the copy.
 * Terraform separately leases the state blob during its operations.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

import {
  readRepositoryBackend,
  type RepositoryStateDestination,
} from "./repository-backend.js";
import { isPendingRepositorySync } from "./repository-sync-retry.js";

export type RepositoryStateStatus = "already-remote" | "imported" | "migrated";

export type TerraformRunner = (
  args: string[],
) => Promise<{ exitCode: number; stderr?: string; stdout: string }>;

type Dependencies = {
  destination: RepositoryStateDestination;
  destinationExists: (
    destination: RepositoryStateDestination,
  ) => Promise<boolean>;
  environmentName?: string;
  repositoryId?: number;
  repositoryName: string;
  repositoryPath: string;
  terraform: TerraformRunner;
  verifyBackend?: () => Promise<void>;
};

const IMPORT_FILE = "dx-import.tf";
const LOCAL_STATE_FILES = ["terraform.tfstate", "terraform.tfstate.backup"];
const DEFAULT_BRANCH = "main";

const repositoryResources = [
  ["github_repository", "this"],
  ["github_repository_vulnerability_alerts", "repository"],
  ["github_branch", "main"],
  ["github_branch_default", "main"],
  ["github_branch_protection", "main"],
  ["github_actions_repository_permissions", "repo"],
];

const localStateSchema = z.object({
  resources: z.array(
    z.object({
      instances: z.array(
        z.object({ attributes: z.record(z.string(), z.unknown()) }),
      ),
      mode: z.enum(["managed", "data"]),
      module: z.string().optional(),
      name: z.string(),
      type: z.string(),
    }),
  ),
});

const planEventSchema = z.object({ type: z.string() });
const planChangeSchema = z.object({
  change: z.object({
    action: z.enum([
      "create",
      "read",
      "update",
      "noop",
      "import",
      "delete",
      "replace",
    ]),
    resource: z.object({ addr: z.string() }),
  }),
  type: z.literal("planned_change"),
});

const readIfExists = async (file: string): Promise<string | undefined> => {
  try {
    return await fs.readFile(file, "utf8");
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.code === "ENOENT") {
      return undefined;
    }
    throw new Error(`Cannot read ${file}`, { cause });
  }
};

const removeLocalState = async (repositoryPath: string): Promise<void> => {
  await Promise.all(
    LOCAL_STATE_FILES.map((file) =>
      fs.rm(path.join(repositoryPath, file), { force: true }),
    ),
  );
};

const validateRepositoryState = (
  content: string,
  repositoryName: string,
  repositoryId?: number,
): boolean => {
  const { resources } = localStateSchema.parse(JSON.parse(content));
  if (resources.length === 0) {
    return false;
  }
  const managed = resources.filter(
    (resource) =>
      resource.module === "module.github_repository" &&
      resource.mode === "managed" &&
      resource.instances.length > 0,
  );
  const repository = managed.find(
    (resource) =>
      resource.type === "github_repository" && resource.name === "this",
  )?.instances[0]?.attributes;
  if (
    repository?.name !== repositoryName ||
    (repositoryId !== undefined &&
      String(repository.repo_id) !== String(repositoryId)) ||
    repositoryResources.some(
      ([type, name]) =>
        !managed.some(
          (resource) => resource.type === type && resource.name === name,
        ),
    )
  ) {
    throw new Error("State does not contain the expected repository resources");
  }
  return true;
};

const hasLocalState = async ({
  repositoryId,
  repositoryName,
  repositoryPath,
}: Dependencies): Promise<boolean> => {
  const content = await readIfExists(
    path.join(repositoryPath, "terraform.tfstate"),
  );
  if (content === undefined) {
    return false;
  }
  try {
    return validateRepositoryState(content, repositoryName, repositoryId);
  } catch {
    throw new Error(
      "infra/repository/terraform.tfstate does not contain valid expected repository resources; recover the correct state and re-run the same `dx add environment` command.",
    );
  }
};

const backendBlock = (d: RepositoryStateDestination): string => `
terraform {
  backend "azurerm" {
    resource_group_name  = ${JSON.stringify(d.resourceGroupName)}
    storage_account_name = ${JSON.stringify(d.storageAccountName)}
    container_name       = ${JSON.stringify(d.containerName)}
    key                  = ${JSON.stringify(d.key)}
    subscription_id      = ${JSON.stringify(d.subscriptionId)}
    use_azuread_auth     = true
  }
}
`;

// Every GitHub object of the repository module that `dx init` creates.
const importBlocks = (repositoryName: string): string =>
  repositoryResources
    .map(
      ([type, name]) =>
        `import {\n  to = module.github_repository.${type}.${name}\n  id = ${JSON.stringify(
          type === "github_branch" || type === "github_branch_protection"
            ? `${repositoryName}:${DEFAULT_BRANCH}`
            : repositoryName,
        )}\n}\n`,
    )
    .join("\n");

const run = async (
  terraform: TerraformRunner,
  args: string[],
): Promise<string> => {
  const { exitCode, stderr, stdout } = await terraform(args);
  if (exitCode !== 0) {
    throw new Error(
      `terraform ${args[0]} failed in infra/repository (exit code ${exitCode})\n${stderr ?? ""}`.trim(),
    );
  }
  return stdout;
};

const verifyCleanPlan = async (terraform: TerraformRunner): Promise<void> => {
  const { exitCode, stderr, stdout } = await terraform([
    "plan",
    "-detailed-exitcode",
    "-input=false",
    "-no-color",
  ]);
  if (exitCode === 2) {
    const summary = /^Plan: \d+ to add, \d+ to change, \d+ to destroy\.$/m.exec(
      stdout,
    )?.[0];
    throw new Error(
      `The repository Terraform plan is not clean. ${summary ? `${summary} ` : ""}Review the plan and re-run the same \`dx add environment\` command.`,
    );
  }
  if (exitCode !== 0) {
    throw new Error(
      `terraform plan failed in infra/repository (exit code ${exitCode})\n${stderr ?? ""}`.trim(),
    );
  }
};

const verifyRemoteIdentity = async ({
  destination,
  destinationExists,
  repositoryId,
  repositoryName,
  terraform,
  verifyBackend,
}: Dependencies): Promise<void> => {
  await verifyBackend?.();
  if (repositoryId === undefined) {
    return;
  }
  if (!(await destinationExists(destination))) {
    throw new Error(
      "The confirmed Azure repository state blob does not exist.",
    );
  }
  const { exitCode, stdout } = await terraform(["state", "pull"]);
  if (exitCode !== 0) {
    throw new Error(
      "Cannot read the initialized repository state from Terraform.",
    );
  }
  // Never attach parser diagnostics: they can contain values from the state.
  try {
    if (validateRepositoryState(stdout, repositoryName, repositoryId)) {
      return;
    }
  } catch {
    throw new Error(
      "Remote state does not contain the expected GitHub repository and resources.",
    );
  }
  throw new Error("Remote repository state is empty.");
};

const verifyImportPlan = async (
  terraform: TerraformRunner,
  planPath: string,
): Promise<void> => {
  const stdout = await run(terraform, [
    "plan",
    "-json",
    "-input=false",
    `-out=${planPath}`,
  ]);
  const destructive: string[] = [];
  const unexpectedCreates: string[] = [];
  let hasSummary = false;
  for (const line of stdout.split("\n").filter((line) => line.trim())) {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (cause) {
      throw new Error(
        "Cannot inspect the repository import plan: invalid JSON",
        { cause },
      );
    }
    const event = planEventSchema.safeParse(value);
    if (!event.success) {
      throw new Error(
        "Cannot inspect the repository import plan: invalid event",
        {
          cause: event.error,
        },
      );
    }
    hasSummary ||= event.data.type === "change_summary";
    if (event.data.type !== "planned_change") {
      continue;
    }
    const parsed = planChangeSchema.safeParse(value);
    if (!parsed.success) {
      throw new Error(
        "Cannot inspect the repository import plan: invalid planned change",
        {
          cause: parsed.error,
        },
      );
    }
    const { action, resource } = parsed.data.change;
    if (action === "delete" || action === "replace") {
      destructive.push(`${action} ${resource.addr}`);
    }
    if (
      action === "create" &&
      /\bgithub_repository_environment(?:_deployment_policy)?\./.test(
        resource.addr,
      )
    ) {
      unexpectedCreates.push(resource.addr);
    }
  }
  if (destructive.length > 0) {
    throw new Error(
      `Importing the repository would destroy or replace GitHub objects (${destructive.join(", ")}); no changes were applied`,
    );
  }
  if (unexpectedCreates.length > 0) {
    throw new Error(
      `The recovery plan would create GitHub environments or deployment policies instead of importing them (${unexpectedCreates.join(", ")}). Import the existing objects before retrying.`,
    );
  }
  if (!hasSummary) {
    throw new Error(
      "Cannot inspect the repository import plan: missing change summary",
    );
  }
};

const migrate = async (
  dependencies: Dependencies,
  providersPath: string,
  hasBackend: boolean,
): Promise<void> => {
  const { destination, destinationExists, repositoryPath, terraform } =
    dependencies;
  if (await destinationExists(destination)) {
    throw new Error(
      `The destination blob ${destination.storageAccountName}/${destination.containerName}/${destination.key} already exists while infra/repository has its own local state; resolve this manually without overwriting either state, then re-run the same \`dx add environment\` command.`,
    );
  }
  if (!hasBackend) {
    const providers = (await readIfExists(providersPath)) ?? "";
    await fs.writeFile(providersPath, providers + backendBlock(destination));
  }
  await run(terraform, [
    "init",
    "-migrate-state",
    "-force-copy",
    "-input=false",
  ]);
  await verifyRemoteIdentity(dependencies);
  await verifyCleanPlan(terraform);
  await removeLocalState(repositoryPath);
};

const importExisting = async (
  dependencies: Dependencies,
  providersPath: string,
  resume = false,
): Promise<void> => {
  const { destination, repositoryName, repositoryPath, terraform } =
    dependencies;
  const main = (await readIfExists(path.join(repositoryPath, "main.tf"))) ?? "";
  if (/\benvironments\s*=\s*\[\s*[^\]\s]/.test(main)) {
    throw new Error(
      "infra/repository has environments configured but no state: recover its state manually before adding environments",
    );
  }
  const importPath = path.join(repositoryPath, IMPORT_FILE);
  const originalProviders = (await readIfExists(providersPath)) ?? "";
  const planDirectory = await fs.mkdtemp(
    path.join(repositoryPath, ".dx-import-"),
  );
  const planPath = path.join(planDirectory, "repository.tfplan");
  let importCreated = false;
  let applyStarted = false;
  let completed = false;
  try {
    if (!resume) {
      await fs.writeFile(importPath, importBlocks(repositoryName), {
        flag: "wx",
      });
      importCreated = true;
      await fs.writeFile(
        providersPath,
        originalProviders + backendBlock(destination),
      );
    }
    await run(terraform, ["init", "-input=false"]);
    await dependencies.verifyBackend?.();
    await verifyImportPlan(terraform, planPath);
    applyStarted = true;
    await run(terraform, ["apply", "-input=false", planPath]);
    await verifyRemoteIdentity(dependencies);
    await verifyCleanPlan(terraform);
    completed = true;
  } catch (cause) {
    if (importCreated && !applyStarted) {
      await fs.writeFile(providersPath, originalProviders);
    }
    throw cause;
  } finally {
    await Promise.all([
      ...(completed || (importCreated && !applyStarted)
        ? [fs.rm(importPath)]
        : []),
      fs.rm(planDirectory, { force: true, recursive: true }),
    ]);
  }
};

export const ensureRemoteRepositoryState = async (
  dependencies: Dependencies,
): Promise<RepositoryStateStatus> => {
  const { destinationExists, repositoryPath, terraform } = dependencies;
  const providersPath = path.join(repositoryPath, "providers.tf");
  const configured = await readRepositoryBackend(repositoryPath);
  const hasBackend = configured !== undefined;
  const destination = configured ?? dependencies.destination;
  const resolved = { ...dependencies, destination };
  const hasLocal = await hasLocalState(dependencies);
  const pendingImport = await readIfExists(
    path.join(repositoryPath, IMPORT_FILE),
  );
  if (pendingImport !== undefined) {
    if (
      !hasBackend ||
      hasLocal ||
      pendingImport !== importBlocks(dependencies.repositoryName)
    ) {
      throw new Error(
        "Unexpected dx-import.tf; review it before retrying repository state preparation.",
      );
    }
    await importExisting(resolved, providersPath, true);
    return "imported";
  }

  if (hasBackend && !hasLocal) {
    // Migration can empty local state before verification succeeds.
    await run(terraform, ["init", "-input=false"]);
    await verifyRemoteIdentity(resolved);
    const { environmentName, repositoryId } = resolved;
    const resumingSync =
      environmentName !== undefined &&
      repositoryId !== undefined &&
      (await readIfExists(
        path.join(repositoryPath, "terraform.tfstate.backup"),
      )) === undefined &&
      (await isPendingRepositorySync(repositoryPath, {
        destination,
        environmentName,
        repositoryId,
      }));
    if (!resumingSync) {
      await verifyCleanPlan(terraform);
    }
    await removeLocalState(repositoryPath);
    return "already-remote";
  }
  if (hasLocal) {
    await migrate(resolved, providersPath, hasBackend);
    return "migrated";
  }
  if (await destinationExists(destination)) {
    const providers = (await readIfExists(providersPath)) ?? "";
    await fs.writeFile(providersPath, providers + backendBlock(destination));
    await run(terraform, ["init", "-input=false"]);
    await verifyRemoteIdentity(resolved);
    await verifyCleanPlan(terraform);
    return "already-remote";
  }
  await importExisting(resolved, providersPath);
  return "imported";
};
