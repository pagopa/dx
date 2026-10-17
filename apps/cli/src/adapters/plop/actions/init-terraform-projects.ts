/**
 * Initializes the generated Terraform projects, in a single pass at the end of
 * the generation.
 *
 * The initialization is delegated to the `init` target of the Nx Terraform
 * plugin: outside CI the target is not frozen, so it locks the provider
 * platforms declared by the repository and refreshes the module lock. The same
 * target runs with a frozen lockfile in `validate-v2`, so the generated
 * projects must carry both `*.lock.hcl` and `tfmodules.lock.json` before their
 * first validation pull request.
 *
 * Only the projects of the requested environments are initialized: running the
 * target over the whole workspace would initialize unrelated environments,
 * which need access to their own backend and would have their module lock
 * rewritten.
 *
 * Unlike the formatting pass, a failure here is not swallowed: a generated
 * repository without lock files fails its own CI.
 */
import { $ as execa$ } from "execa";
import { type NodePlopAPI } from "node-plop";

import {
  type Payload,
  payloadSchema,
} from "../generators/environment/prompts.js";

/**
 * The repository root is a Terraform project of its own, but it is not scoped
 * to a single environment: the Nx Terraform plugin tags it with the production
 * environment, so it is selected by name instead of by environment tag.
 */
export const REPOSITORY_PROJECT = "repository";

const getProjectsSelection = (environments: readonly string[]): string => {
  const projects = [...new Set(environments)].map((environment) =>
    environment === REPOSITORY_PROJECT
      ? REPOSITORY_PROJECT
      : `tag:env:${environment}`,
  );

  if (projects.length === 0) {
    throw new Error("No Terraform project to initialize");
  }

  return projects.join(",");
};

/**
 * Initializes the Terraform projects of the given environments, selected by
 * their `env:<name>` tag, plus the repository root when `REPOSITORY_PROJECT` is
 * passed.
 */
export const initTerraformProjects = async (
  environments: readonly string[],
): Promise<void> => {
  const projects = getProjectsSelection(environments);
  const $ = execa$({});

  await $`mise exec -- pnpm exec nx run-many -t init --projects=${projects}`;
};

export const setInitTerraformProjectsAction = (plop: NodePlopAPI): void => {
  plop.setActionType("initTerraformProjects", async (data) => {
    const payload: Payload = payloadSchema.parse(data);

    await initTerraformProjects([payload.env.name]);
    return `Terraform projects of ${payload.env.name} initialized`;
  });
};
