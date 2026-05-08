import { PromiseExecutor } from "@nx/devkit";

import type { NxReleasePublishExecutorSchema } from "./schema.d.ts";

import { configurePackageLogger, getPackageLogger } from "../../logger.ts";

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
  if (
    !options.projectRoot ||
    !options.description ||
    !options.provider ||
    !options.version
  ) {
    return {
      success: false,
    };
  }
  const repoName = getRepoNameFromProjectRoot(
    options.projectRoot,
    options.provider,
  );

  await configurePackageLogger();
  const logger = getPackageLogger(["publish"]);
  logger.info(
    "Publishing Terraform module from {projectRoot} to repository {repoName}...",
    {
      projectRoot: options.projectRoot,
      repoName,
    },
  );

  return {
    success: true,
  };
};

export default runExecutor;
