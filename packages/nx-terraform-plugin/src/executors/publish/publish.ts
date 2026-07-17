import { PromiseExecutor } from "@nx/devkit";
import { z } from "zod/v4";

import {
  getRepoNameFromProjectRoot,
  publishToGithub,
} from "../../adapters/github/publisher.ts";
import { configureLogger, getPackageLogger } from "../../logger.ts";
import {
  type NxReleasePublishExecutorInput,
  nxReleasePublishExecutorSchema,
} from "./schema.ts";

export { getRepoNameFromProjectRoot } from "../../adapters/github/publisher.ts";

const runExecutor: PromiseExecutor<NxReleasePublishExecutorInput> = async (
  options,
) => {
  const logger = getPackageLogger(["publish"]);
  const parseResult = nxReleasePublishExecutorSchema.safeParse({
    ...options,
    environment: process.env,
  });

  await configureLogger();

  if (!parseResult.success) {
    logger.warn("Invalid publish options", {
      error: z.prettifyError(parseResult.error),
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

  const publishResult = await publishToGithub(validatedOptions);

  if (publishResult === "skipped") {
    logger.info("Skipping release, tag already exists");
  }

  return {
    success: true,
  };
};

export default runExecutor;
