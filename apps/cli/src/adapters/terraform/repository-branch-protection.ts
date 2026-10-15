/**
 * Reconcile provider-imported repository identifiers without replacing protection rules.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod/v4";

import type { GitHubRepo } from "../../domain/github-repo.js";
import type {
  RepositoryImportResource,
  TerraformRunner,
} from "./repository-imports.js";

import {
  parseRepositoryState,
  parseTerraformJson,
  terraformStateSchema,
  verifyStateCopy,
} from "../../domain/repository-state.js";

const resourceSchema = terraformStateSchema.shape.resources.element;
// Preserve opaque provider metadata when round-tripping the whole snapshot.
const snapshotSchema = z.looseObject({
  ...terraformStateSchema.shape,
  resources: z.array(
    z.looseObject({
      ...resourceSchema.shape,
      instances: z.array(
        z.looseObject(resourceSchema.shape.instances.element.shape),
      ),
    }),
  ),
});

type BranchProtectionIdentity = {
  address: string;
  id: string;
  importing: boolean;
  pattern: string;
  repositoryName: string;
  repositoryNodeId: string;
};

const isBranchProtectionReplacement = (
  resource: RepositoryImportResource,
): boolean =>
  resource.mode === "managed" &&
  resource.type === "github_branch_protection" &&
  resource.address ===
    "module.github_repository.github_branch_protection.main" &&
  resource.change.actions.length === 2 &&
  resource.change.actions.includes("delete") &&
  resource.change.actions.includes("create") &&
  isDeepStrictEqual(resource.change.replace_paths, [["repository_id"]]);

export const branchProtectionIdentityReplacements = (
  resources: RepositoryImportResource[],
  github: GitHubRepo,
): BranchProtectionIdentity[] => {
  const repository = resources.find(
    ({ address }) =>
      address === "module.github_repository.github_repository.this",
  );
  const nodeId = repository?.change.before?.node_id;
  const name = repository?.change.after?.name;
  if (
    typeof nodeId !== "string" ||
    nodeId.length === 0 ||
    typeof name !== "string" ||
    name.toLowerCase() !== github.repo.toLowerCase()
  ) {
    return [];
  }
  return resources.flatMap((resource) => {
    const before = resource.change.before;
    const after = resource.change.after;
    if (
      !isBranchProtectionReplacement(resource) ||
      before?.repository_id !== nodeId ||
      after?.repository_id !== name ||
      resource.change.after_unknown?.repository_id ||
      typeof before?.id !== "string" ||
      before.id.length === 0 ||
      typeof before.pattern !== "string" ||
      before.pattern.length === 0 ||
      before.pattern !== after?.pattern ||
      (resource.change.importing !== undefined &&
        resource.change.importing.id !== `${github.repo}:${before.pattern}`)
    ) {
      return [];
    }
    return [
      {
        address: resource.address,
        id: before.id,
        importing: resource.change.importing !== undefined,
        pattern: before.pattern,
        repositoryName: name,
        repositoryNodeId: nodeId,
      },
    ];
  });
};

const protectionInstance = (
  state: z.infer<typeof snapshotSchema>,
  identity: BranchProtectionIdentity,
) => {
  const resources = state.resources.filter(
    (resource) =>
      resource.mode === "managed" &&
      `${resource.module}.${resource.type}.${resource.name}` ===
        identity.address,
  );
  const instance = resources[0]?.instances[0];
  if (
    resources.length !== 1 ||
    resources[0].instances.length !== 1 ||
    instance?.index_key !== undefined ||
    instance?.attributes.id !== identity.id ||
    instance.attributes.pattern !== identity.pattern
  ) {
    throw new Error(
      "Imported branch-protection state differs from the recovery plan.",
    );
  }
  return instance;
};

export const reconcileBranchProtectionIdentities = async ({
  directory,
  github,
  identities,
  resources,
  run,
}: {
  directory: string;
  github: GitHubRepo;
  identities: BranchProtectionIdentity[];
  resources: RepositoryImportResource[];
  run: TerraformRunner;
}): Promise<void> => {
  const repository = resources.find(
    ({ address }) =>
      address === "module.github_repository.github_repository.this",
  );
  if (repository?.change.importing) {
    await run(["import", "-input=false", repository.address, github.repo]);
  }
  for (const identity of identities) {
    if (identity.importing) {
      await run([
        "import",
        "-input=false",
        identity.address,
        `${github.repo}:${identity.pattern}`,
      ]);
    }
  }
  const { stdout } = await run(["state", "pull"]);
  const original = parseRepositoryState(stdout, github);
  const result = snapshotSchema.safeParse(
    parseTerraformJson(stdout, "Imported repository state"),
  );
  if (!result.success) {
    throw new Error("Imported repository state has unsupported metadata.");
  }
  for (const identity of identities) {
    const instance = protectionInstance(result.data, identity);
    const repositoryNodeId = original.resources.find(
      (resource) =>
        resource.mode === "managed" &&
        resource.module === "module.github_repository" &&
        resource.type === "github_repository" &&
        resource.name === "this",
    )?.instances[0]?.attributes.node_id;
    if (
      repositoryNodeId !== identity.repositoryNodeId ||
      instance.attributes.repository_id !== identity.repositoryNodeId
    ) {
      throw new Error(
        "Cannot prove imported branch protection belongs to the expected repository.",
      );
    }
    instance.attributes.repository_id = identity.repositoryName;
  }
  const nextSerial = result.data.serial + 1;
  if (!Number.isSafeInteger(nextSerial)) {
    throw new Error("Cannot safely advance the repository state serial.");
  }
  result.data.serial = nextSerial;
  const filename = path.join(directory, "repository-recovery.tfstate");
  await fs.writeFile(filename, JSON.stringify(result.data), {
    flag: "wx",
    mode: 0o600,
  });
  // Never force: Terraform retains its lock, lineage and newer-serial safeguards.
  await run(["state", "push", filename]);
  const pushed = await run(["state", "pull"]);
  verifyStateCopy(original, parseRepositoryState(pushed.stdout, github));
};
