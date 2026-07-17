import { PromiseExecutor } from "@nx/devkit";

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
    const issues = parseResult.error.issues.flatMap((issue) =>
      issue.code === "invalid_union" ? issue.errors.flat() : [issue],
    );
    const hasEnvironmentIssue = issues.some(
      (issue) => issue.path[0] === "environment",
    );
    logger.warn(
      hasEnvironmentIssue
        ? "Invalid GitHub authentication environment"
        : "Invalid publish options",
      {
        issues,
        path: options.projectRoot ?? "publish options",
      },
    );
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

  const publishResult = await publishToGithub({
    description: validatedOptions.description,
    githubAppCredentials: validatedOptions.githubAppCredentials,
    githubOwner: validatedOptions.githubOwner,
    githubToken: validatedOptions.githubToken,
    projectRoot: validatedOptions.projectRoot,
    provider: validatedOptions.provider,
    version: validatedOptions.version,
    workspaceRoot: validatedOptions.workspaceRoot,
  });

  if (publishResult === "skipped") {
    logger.info("Skipping release, tag already exists");
  }

  return {
    success: true,
  };
};

export default runExecutor;
