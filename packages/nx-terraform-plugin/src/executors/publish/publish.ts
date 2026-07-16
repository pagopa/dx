import { PromiseExecutor } from "@nx/devkit";

import {
  getRepoNameFromProjectRoot,
  publishToGithub,
} from "../../adapters/github/publisher.ts";
import { configureLogger, getPackageLogger } from "../../logger.ts";
import {
  githubAppEnvironmentSchema,
  githubTokenEnvironmentSchema,
  type NxReleasePublishExecutorInput,
  nxReleasePublishExecutorSchema,
} from "./schema.ts";

export { getRepoNameFromProjectRoot } from "../../adapters/github/publisher.ts";

const runExecutor: PromiseExecutor<NxReleasePublishExecutorInput> = async (
  options,
) => {
  const logger = getPackageLogger(["publish"]);
  const parseResult = nxReleasePublishExecutorSchema.safeParse(options);

  await configureLogger();

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
  let githubAppCredentials:
    | undefined
    | { clientId: string; privateKey: string };
  let githubToken: string;

  if (validatedOptions.useGitHubAppAuthentication) {
    const environmentParseResult = githubAppEnvironmentSchema.safeParse(
      process.env,
    );
    if (!environmentParseResult.success) {
      logger.warn("Invalid GitHub authentication environment", {
        issues: environmentParseResult.error.issues,
        path: validatedOptions.projectRoot,
      });
      return { success: false };
    }
    githubAppCredentials = {
      clientId: environmentParseResult.data.GH_APP_CLIENT_ID,
      privateKey: environmentParseResult.data.GH_APP_KEY,
    };
    githubToken = "";
  } else {
    const environmentParseResult = githubTokenEnvironmentSchema.safeParse(
      process.env,
    );
    if (!environmentParseResult.success) {
      logger.warn("Invalid GitHub authentication environment", {
        issues: environmentParseResult.error.issues,
        path: validatedOptions.projectRoot,
      });
      return { success: false };
    }
    githubToken = environmentParseResult.data;
  }

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
    githubAppCredentials,
    githubOwner: validatedOptions.githubOwner,
    githubToken,
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
