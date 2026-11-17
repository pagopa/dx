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

export type RepositoryStateStatus = "already-remote" | "imported" | "migrated";

export type TerraformRunner = (
  args: string[],
) => Promise<{ exitCode: number; stdout: string }>;

type Dependencies = {
  destination: RepositoryStateDestination;
  destinationExists: (
    destination: RepositoryStateDestination,
  ) => Promise<boolean>;
  repositoryName: string;
  repositoryPath: string;
  terraform: TerraformRunner;
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

const hasLocalState = async (
  repositoryPath: string,
  repositoryName: string,
): Promise<boolean> => {
  const content = await readIfExists(
    path.join(repositoryPath, "terraform.tfstate"),
  );
  if (content === undefined) {
    return false;
  }
  try {
    const parsed = localStateSchema.safeParse(JSON.parse(content));
    if (!parsed.success) {
      throw new Error("Cannot identify the expected repository resources", {
        cause: parsed.error,
      });
    }
    if (parsed.data.resources.length === 0) {
      return false;
    }
    const resources = parsed.data.resources;
    const missing = repositoryResources.filter(
      ([type, name]) =>
        !resources.some(
          (resource) =>
            resource.module === "module.github_repository" &&
            resource.mode === "managed" &&
            resource.type === type &&
            resource.name === name &&
            resource.instances.length > 0,
        ),
    );
    const repository = resources.find(
      (resource) =>
        resource.module === "module.github_repository" &&
        resource.type === "github_repository" &&
        resource.name === "this",
    );
    if (
      missing.length > 0 ||
      repository?.instances[0]?.attributes.name !== repositoryName
    ) {
      throw new Error(
        "Local state does not contain the expected repository resources",
      );
    }
    return true;
  } catch (cause) {
    throw new Error(
      "infra/repository/terraform.tfstate does not contain valid expected repository resources; recover the correct state and re-run the same `dx add environment` command.",
      { cause },
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
  expectedExitCodes = [0],
): Promise<string> => {
  const { exitCode, stdout } = await terraform(args);
  if (!expectedExitCodes.includes(exitCode)) {
    throw new Error(
      `terraform ${args[0]} failed in infra/repository (exit code ${exitCode})\n${stdout}`.trim(),
    );
  }
  return stdout;
};

const verifyCleanPlan = async (terraform: TerraformRunner): Promise<void> => {
  const exitCode = (
    await terraform(["plan", "-detailed-exitcode", "-input=false"])
  ).exitCode;
  if (exitCode !== 0) {
    throw new Error(
      "The repository state in the backend does not match the infrastructure (terraform plan is not clean). Fix the problem and re-run the same `dx add environment` command.",
    );
  }
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
  }
  if (destructive.length > 0) {
    throw new Error(
      `Importing the repository would destroy or replace GitHub objects (${destructive.join(", ")}); no changes were applied`,
    );
  }
  if (!hasSummary) {
    throw new Error(
      "Cannot inspect the repository import plan: missing change summary",
    );
  }
};

const migrate = async (
  { destination, destinationExists, repositoryPath, terraform }: Dependencies,
  providersPath: string,
  hasBackend: boolean,
): Promise<void> => {
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
  await verifyCleanPlan(terraform);
  await removeLocalState(repositoryPath);
};

const importExisting = async (
  { destination, repositoryName, repositoryPath, terraform }: Dependencies,
  providersPath: string,
): Promise<void> => {
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
  try {
    await fs.writeFile(importPath, importBlocks(repositoryName), {
      flag: "wx",
    });
    importCreated = true;
    await fs.writeFile(
      providersPath,
      originalProviders + backendBlock(destination),
    );
    await run(terraform, ["init", "-input=false"]);
    await verifyImportPlan(terraform, planPath);
    await run(terraform, ["apply", "-input=false", planPath]);
  } catch (cause) {
    await fs.writeFile(providersPath, originalProviders);
    throw cause;
  } finally {
    await Promise.all([
      ...(importCreated ? [fs.rm(importPath)] : []),
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
  const hasLocal = await hasLocalState(
    repositoryPath,
    dependencies.repositoryName,
  );

  if (hasBackend && !hasLocal) {
    // Migration can empty local state before verification succeeds.
    await run(terraform, ["init", "-input=false"]);
    await verifyCleanPlan(terraform);
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
    await verifyCleanPlan(terraform);
    return "already-remote";
  }
  await importExisting(resolved, providersPath);
  return "imported";
};
