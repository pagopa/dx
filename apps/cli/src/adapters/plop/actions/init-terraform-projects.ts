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
 * No project filter is needed, the target is idempotent over already
 * initialized projects.
 *
 * Unlike the formatting pass, a failure here is not swallowed: a generated
 * repository without lock files fails its own CI.
 */
import { $ as execa$ } from "execa";
import { type NodePlopAPI } from "node-plop";

export const initTerraformProjects = async (): Promise<void> => {
  const $ = execa$({});

  await $`mise exec -- pnpm exec nx run-many -t init`;
};

export const setInitTerraformProjectsAction = (plop: NodePlopAPI): void => {
  plop.setActionType("initTerraformProjects", async () => {
    await initTerraformProjects();
    return "Generated Terraform projects initialized";
  });
};
