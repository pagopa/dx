/**
 * Moves the Terraform state of infra/repository to the shared Azure backend.
 *
 * `dx init` leaves that state on the local disk. The first `dx add
 * environment` calls ensureRemoteRepositoryState to make it remote:
 *
 * - backend configured, no local state: nothing to do (`already-remote`);
 * - local state: copied to the backend with `terraform init -migrate-state`,
 *   verified with a clean plan, then deleted (`migrated`);
 * - no local state but state already in the backend: reused (`already-remote`);
 * - no state anywhere (for example, a new device): the GitHub objects of the
 *   repository module are imported into the backend (`imported`).
 *
 * Terraform copies state over an existing destination without asking, so the
 * destination is checked first. Concurrent runs are rejected by the backend
 * lease taken by Terraform itself.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";

export type RepositoryStateDestination = {
  containerName: string;
  key: string;
  resourceGroupName: string;
  storageAccountName: string;
  subscriptionId: string;
};

export type RepositoryStateStatus = "already-remote" | "imported" | "migrated";

export type TerraformRunner = (
  args: string[],
) => Promise<{ exitCode: number; stdout: string }>;

type Dependencies = {
  destination: RepositoryStateDestination;
  destinationHasState: (
    destination: RepositoryStateDestination,
  ) => Promise<boolean>;
  repositoryName: string;
  repositoryPath: string;
  terraform: TerraformRunner;
};

const IMPORT_FILE = "dx-import.tf";
const LOCAL_STATE_FILES = ["terraform.tfstate", "terraform.tfstate.backup"];
const DEFAULT_BRANCH = "main";

const localStateSchema = z.object({
  resources: z.array(z.unknown()).default([]),
});

const planChangeSchema = z.object({
  change: z.object({
    action: z.string(),
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

const hasLocalState = async (repositoryPath: string): Promise<boolean> => {
  const content = await readIfExists(
    path.join(repositoryPath, "terraform.tfstate"),
  );
  if (!content?.trim()) {
    return false;
  }
  try {
    return localStateSchema.parse(JSON.parse(content)).resources.length > 0;
  } catch (cause) {
    throw new Error(
      "infra/repository/terraform.tfstate is not valid Terraform state; fix or remove it and re-run the same command",
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
  [
    ["github_repository.this", repositoryName],
    ["github_repository_vulnerability_alerts.repository", repositoryName],
    ["github_branch.main", `${repositoryName}:${DEFAULT_BRANCH}`],
    ["github_branch_default.main", repositoryName],
    ["github_branch_protection.main", `${repositoryName}:${DEFAULT_BRANCH}`],
    ["github_actions_repository_permissions.repo", repositoryName],
  ]
    .map(
      ([address, id]) =>
        `import {\n  to = module.github_repository.${address}\n  id = ${JSON.stringify(id)}\n}\n`,
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
      "The repository state in the backend does not match the infrastructure (terraform plan is not clean)",
    );
  }
};

const verifyImportPlan = async (terraform: TerraformRunner): Promise<void> => {
  const stdout = await run(terraform, ["plan", "-json", "-input=false"]);
  const destructive = stdout
    .split("\n")
    .flatMap((line) => {
      try {
        const parsed = planChangeSchema.safeParse(JSON.parse(line));
        return parsed.success ? [parsed.data.change] : [];
      } catch {
        return [];
      }
    })
    .filter(({ action }) => action === "delete" || action === "replace")
    .map(({ action, resource }) => `${action} ${resource.addr}`);
  if (destructive.length > 0) {
    throw new Error(
      `Importing the repository would destroy or replace GitHub objects (${destructive.join(", ")}); no changes were applied`,
    );
  }
};

const migrate = async (
  { destination, destinationHasState, repositoryPath, terraform }: Dependencies,
  providersPath: string,
  hasBackend: boolean,
): Promise<void> => {
  if (await destinationHasState(destination)) {
    throw new Error(
      `The remote state ${destination.storageAccountName}/${destination.containerName}/${destination.key} already contains resources while infra/repository has its own local state; resolve this manually`,
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
  await Promise.all(
    LOCAL_STATE_FILES.map((file) =>
      fs.rm(path.join(repositoryPath, file), { force: true }),
    ),
  );
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
  try {
    await fs.writeFile(
      providersPath,
      originalProviders + backendBlock(destination),
    );
    await fs.writeFile(importPath, importBlocks(repositoryName));
    await run(terraform, ["init", "-input=false"]);
    await verifyImportPlan(terraform);
    await run(terraform, ["apply", "-auto-approve", "-input=false"]);
  } catch (cause) {
    await fs.writeFile(providersPath, originalProviders);
    throw cause;
  } finally {
    await fs.rm(importPath, { force: true });
  }
};

export const ensureRemoteRepositoryState = async (
  dependencies: Dependencies,
): Promise<RepositoryStateStatus> => {
  const { destination, destinationHasState, repositoryPath, terraform } =
    dependencies;
  const providersPath = path.join(repositoryPath, "providers.tf");
  const hasBackend = /\bbackend\s+"azurerm"/.test(
    (await readIfExists(providersPath)) ?? "",
  );
  const hasLocal = await hasLocalState(repositoryPath);

  if (hasBackend && !hasLocal) {
    return "already-remote";
  }
  if (hasLocal) {
    await migrate(dependencies, providersPath, hasBackend);
    return "migrated";
  }
  if (await destinationHasState(destination)) {
    const providers = (await readIfExists(providersPath)) ?? "";
    await fs.writeFile(providersPath, providers + backendBlock(destination));
    await run(terraform, ["init", "-input=false"]);
    await verifyCleanPlan(terraform);
    return "already-remote";
  }
  await importExisting(dependencies, providersPath);
  return "imported";
};
