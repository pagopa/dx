/**
 * Publishes the Docker image tagged during versioning and mirrors it to the rolling latest tag.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  type ReleasePublishExecutorOptions,
  releasePublishSchema,
} from "./schema.ts";

interface ProjectGraphNodeLike {
  data: {
    root: string;
  };
}

export interface DockerPublishExecutorContext {
  projectGraph?: {
    nodes: Record<string, ProjectGraphNodeLike>;
  };
  projectName?: string;
  root: string;
}

const normalizeImageReference = (imageReference: string) =>
  imageReference.startsWith("docker.io/")
    ? imageReference.slice("docker.io/".length)
    : imageReference;

const getLatestImageReference = (imageReference: string) => {
  const lastSlashIndex = imageReference.lastIndexOf("/");
  const lastColonIndex = imageReference.lastIndexOf(":");

  if (lastColonIndex <= lastSlashIndex) {
    throw new Error(
      `Image reference '${imageReference}' does not contain an explicit version tag.`,
    );
  }

  return `${imageReference.slice(0, lastColonIndex)}:latest`;
};

const getDockerVersionFilePath = (workspaceRoot: string, projectRoot: string) =>
  path.join(workspaceRoot, "tmp", projectRoot, ".docker-version");

const readImageReference = (workspaceRoot: string, projectRoot: string) => {
  const dockerVersionFilePath = getDockerVersionFilePath(workspaceRoot, projectRoot);

  if (!existsSync(dockerVersionFilePath)) {
    throw new Error(
      `Could not find ${dockerVersionFilePath}. Did you run 'nx release version'?`,
    );
  }

  const imageReference = readFileSync(dockerVersionFilePath, {
    encoding: "utf8",
  }).trim();

  if (!imageReference) {
    throw new Error(`The file ${dockerVersionFilePath} is empty.`);
  }

  return imageReference;
};

const assertLocalImageExists = (imageReference: string) => {
  try {
    execSync(`docker image inspect ${normalizeImageReference(imageReference)}`, {
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
    });
  } catch {
    throw new Error(
      `Could not find local Docker image '${imageReference}'. Did you run 'nx release version'?`,
    );
  }
};

const runDockerCommand = (command: string, quiet: boolean) => {
  execSync(command, {
    stdio: quiet ? ["ignore", "ignore", "pipe"] : "inherit",
    windowsHide: true,
  });
};

const runPublish = (imageReference: string, quiet: boolean) => {
  const latestImageReference = getLatestImageReference(imageReference);

  console.info(`Pushing Docker image ${imageReference}`);
  runDockerCommand(`docker push ${imageReference}`, quiet);

  console.info(`Tagging Docker image ${latestImageReference}`);
  runDockerCommand(`docker tag ${imageReference} ${latestImageReference}`, quiet);

  console.info(`Pushing Docker image ${latestImageReference}`);
  runDockerCommand(`docker push ${latestImageReference}`, quiet);
};

export const releasePublishExecutor = async (
  rawOptions: unknown,
  context: DockerPublishExecutorContext,
) => {
  const parseResult = releasePublishSchema.safeParse(rawOptions);

  if (!parseResult.success) {
    throw new Error("Invalid Docker publish executor options.", {
      cause: parseResult.error,
    });
  }

  const options = parseResult.data;
  const projectName = context.projectName;
  const projectNode =
    projectName && context.projectGraph
      ? context.projectGraph.nodes[projectName]
      : undefined;

  if (!projectName || !projectNode) {
    throw new Error("Could not resolve the current project for Docker publish.");
  }

  const imageReference = readImageReference(context.root, projectNode.data.root);
  const dryRun = process.env.NX_DRY_RUN === "true" || options.dryRun === true;
  const quiet = options.quiet ?? false;
  const latestImageReference = getLatestImageReference(imageReference);

  if (dryRun) {
    console.info(
      `Dry run enabled: would push '${imageReference}' and '${latestImageReference}'.`,
    );
    return { success: true };
  }

  assertLocalImageExists(imageReference);
  runPublish(imageReference, quiet);

  return { success: true };
};

export default releasePublishExecutor;