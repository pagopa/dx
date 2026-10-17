/**
 * Repository state contracts shared by Terraform orchestration and cloud storage.
 */
import { z } from "zod/v4";

import { terraformBackendSchema } from "./remote-backend.js";

export const repositoryStateDestinationSchema = z.object({
  backend: terraformBackendSchema.refine(
    (backend) => /^[a-z0-9]{3,24}$/.test(backend.storageAccountName),
    "Azure storage account names must contain 3-24 lowercase letters or digits.",
  ),
  containerName: z.string().min(1),
  key: z.string().min(1),
});

export type RepositoryStateDestination = z.infer<
  typeof repositoryStateDestinationSchema
>;

export const repositoryStateResultSchema = z.object({
  destination: repositoryStateDestinationSchema,
  status: z.enum(["pending", "remote-verified"]),
});

export type RepositoryStateResult = z.infer<typeof repositoryStateResultSchema>;

export type RepositoryStateStorage = {
  read(destination: RepositoryStateDestination): Promise<string | undefined>;
  withLock<T>(
    destination: RepositoryStateDestination,
    task: (signal?: AbortSignal) => Promise<T>,
  ): Promise<T>;
};

export const terraformStateSchema = z.object({
  lineage: z.string().min(1),
  resources: z.array(
    z.object({
      instances: z.array(
        z.object({
          attributes: z.record(z.string(), z.unknown()),
          index_key: z.union([z.string(), z.number()]).optional(),
        }),
      ),
      mode: z.enum(["managed", "data"]),
      module: z.string().optional(),
      name: z.string(),
      type: z.string(),
    }),
  ),
  serial: z.number().int().nonnegative(),
  version: z.literal(4),
});

export type TerraformState = z.infer<typeof terraformStateSchema>;

export const parseTerraformJson = (
  content: string,
  description: string,
): unknown => {
  try {
    return JSON.parse(content);
  } catch (cause) {
    if (cause instanceof SyntaxError) {
      // Parser diagnostics can embed secret state contents in verbose output.
      cause.message = "Invalid JSON state payload.";
      cause.stack = undefined;
      throw new Error(`${description} is not valid JSON.`, {
        cause,
      });
    }
    throw cause;
  }
};

export const parseRepositoryState = (
  content: string,
  github: { owner: string; repo: string },
): TerraformState => {
  const input = parseTerraformJson(content, "Repository Terraform state");
  const result = terraformStateSchema.safeParse(input);
  if (!result.success) {
    throw new Error("Repository Terraform state has an unsupported structure.");
  }

  const repositories = result.data.resources.filter(
    (resource) =>
      resource.mode === "managed" &&
      resource.module === "module.github_repository" &&
      resource.type === "github_repository" &&
      resource.name === "this",
  );
  const expectedName = `${github.owner}/${github.repo}`.toLowerCase();
  if (
    repositories.length !== 1 ||
    repositories[0].instances.length !== 1 ||
    typeof repositories[0].instances[0].attributes.full_name !== "string" ||
    repositories[0].instances[0].attributes.full_name.toLowerCase() !==
      expectedName
  ) {
    throw new Error(
      `Terraform state does not manage the expected repository ${github.owner}/${github.repo}.`,
    );
  }
  if (
    result.data.resources.some(
      (resource) =>
        resource.mode === "managed" &&
        resource.instances.some(
          (instance) =>
            !z
              .union([z.string().min(1), z.number()])
              .safeParse(instance.attributes.id).success,
        ),
    )
  ) {
    throw new Error(
      "Repository Terraform state contains managed resources without identities.",
    );
  }
  return result.data;
};

export const isEmptyTerraformState = (content: string): boolean => {
  const result = terraformStateSchema.safeParse(
    parseTerraformJson(content, "Remote Terraform state"),
  );
  if (!result.success) {
    throw new Error("Remote Terraform state has an unsupported structure.");
  }
  return result.data.resources.every((resource) => resource.mode === "data");
};

const resourceIdentities = (state: TerraformState): Set<string> =>
  new Set(
    state.resources
      .filter((resource) => resource.mode === "managed")
      .flatMap((resource) =>
        resource.instances.map((instance) =>
          JSON.stringify([
            resource.module,
            resource.type,
            resource.name,
            instance.index_key,
            instance.attributes.id,
          ]),
        ),
      ),
  );

export const verifyStateCopy = (
  local: TerraformState,
  remote: TerraformState,
): void => {
  const remoteIdentities = resourceIdentities(remote);
  if (
    local.lineage !== remote.lineage ||
    remote.serial < local.serial ||
    !Array.from(resourceIdentities(local)).every((identity) =>
      remoteIdentities.has(identity),
    )
  ) {
    throw new Error(
      "Remote repository state differs from local state; refusing to overwrite it or remove local files.",
    );
  }
};
