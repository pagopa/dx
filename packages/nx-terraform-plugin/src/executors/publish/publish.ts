import { PromiseExecutor } from "@nx/devkit";

import {
  getRepoNameFromProjectRoot,
  publishToGithub,
} from "../../adapters/github/publisher.ts";
import { getPackageLogger } from "../../logger.ts";
import {
  type NxReleasePublishExecutorInput,
  nxReleasePublishExecutorSchema,
} from "./schema.ts";

export { getRepoNameFromProjectRoot } from "../../adapters/github/publisher.ts";

const runExecutor: PromiseExecutor<NxReleasePublishExecutorInput> = async (
  options,
) => {
  const logger = getPackageLogger(["publish"]);
  const parseResult = nxReleasePublishExecutorSchema.safeParse(options);

  if (!parseResult.success) {
    logger.warn("Invalid publish options", {
      issues: parseResult.error.issues,
      path: options.projectRoot ?? "publish options",
    });
    return {
      success: false,
    };
  }

  const validatedOptions = parseResult.data;
  const repoName = getRepoNameFromProjectRoot(
    validatedOptions.projectRoot,
    validatedOptions.provider,
  );

  logger.info(
    "Publishing Terraform module from {projectRoot} to repository {repoName}...",
    {
      projectRoot: validatedOptions.projectRoot,
      repoName,
    },
  );

  await publishToGithub({
    description: validatedOptions.description,
    githubOwner: validatedOptions.githubOwner,
    projectRoot: validatedOptions.projectRoot,
    provider: validatedOptions.provider,
    version: validatedOptions.version,
    workspaceRoot: validatedOptions.workspaceRoot,
  });

  return {
    success: true,
  };
};

export default runExecutor;
