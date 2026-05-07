import { PromiseExecutor } from "@nx/devkit";

import type { NxReleasePublishExecutorSchema } from "./schema.d.ts";

export const getRepoNameFromProjectRoot = (
  projectRoot: string,
  provider: string,
) => {
  const moduleName = projectRoot.split("/").pop()?.replaceAll("_", "-") ?? "";
  return `terraform-${provider}-${moduleName}`;
};

const runExecutor: PromiseExecutor<NxReleasePublishExecutorSchema> = async (
  options,
) => {
  if (!options.projectRoot) {
    return {
      success: false,
    };
  }
  const provider = options.provider ?? "azurerm";
  getRepoNameFromProjectRoot(options.projectRoot, provider);

  return {
    success: true,
  };
};

export default runExecutor;
