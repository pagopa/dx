/**
 * Formats everything the scaffold writes or changes, in a single pass at the
 * end of the generation.
 *
 * The formatting is delegated to the Nx tasks of the target repository, so the
 * repository stays the single source of truth for the formatting
 * configuration: `nx format:write` runs the workspace formatter over the files
 * it manages and `nx run-many -t fmt` runs the `fmt` target of every project
 * that exposes one, which is how the Nx Terraform plugin formats the generated
 * Terraform modules. No file or project filter is needed, both commands are
 * idempotent over already formatted code.
 *
 * Formatting is best-effort: a repository that does not install the DX Nx
 * plugins or the workspace formatter keeps generating environments, it just
 * gets a warning.
 */
import { getLogger } from "@logtape/logtape";
import { $ as execa$ } from "execa";
import { type NodePlopAPI } from "node-plop";

export const formatGeneratedCode = async (): Promise<void> => {
  const logger = getLogger(["gen", "env"]);
  const $ = execa$({});

  try {
    await $`mise exec -- pnpm exec nx format:write --all`;
    await $`mise exec -- pnpm exec nx run-many -t fmt`;
  } catch (error) {
    logger.warn(
      "Could not format the generated files: {error}. Run `nx format:write` and `nx run-many -t fmt` in the repository to format them manually.",
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
};

export const setFormatGeneratedCodeAction = (plop: NodePlopAPI): void => {
  plop.setActionType("formatGeneratedCode", async () => {
    await formatGeneratedCode();
    return "Generated files formatted";
  });
};
