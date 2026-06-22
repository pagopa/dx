/**
 * Publishes the Docker image tagged during versioning and mirrors it to the rolling latest tag.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import {
  buildMetadataTagArguments,
  getRuntimeContext,
} from "../build/build.ts";
import {
  type ReleasePublishExecutorOptions,
  releasePublishSchema,
} from "./schema.ts";

interface DockerBuildTargetLike {
  executor?: string;
  options?: {
    metadata?: {
      tags?: unknown;
    };
  };
}

interface ProjectGraphNodeLike {
  data: {
    root: string;
    targets?: Record<string, DockerBuildTargetLike>;
  };
}

export interface DockerPublishExecutorContext {
  projectGraph?: {
    nodes: Record<string, ProjectGraphNodeLike>;
  };
  projectName?: string;
  root: string;
}

// Docker stores local images without the docker.io prefix, so normalize before local inspection.
const normalizeImageReference = (imageReference: string) =>
  imageReference.startsWith("docker.io/")
    ? imageReference.slice("docker.io/".length)
    : imageReference;

const dockerBuildExecutor = "@pagopa/nx-dx-docker-plugin:build";

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

const getExplicitImageTag = (imageReference: string) => {
  const lastSlashIndex = imageReference.lastIndexOf("/");
  const lastColonIndex = imageReference.lastIndexOf(":");

  return lastColonIndex > lastSlashIndex
    ? imageReference.slice(lastColonIndex + 1)
    : undefined;
};

const getBuildMetadataTags = (projectNode: ProjectGraphNodeLike) => {
  const buildTarget = Object.values(projectNode.data.targets ?? {}).find(
    (target) => target.executor === dockerBuildExecutor,
  );
  const tags = buildTarget?.options?.metadata?.tags;

  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === "string")
    : undefined;
};

const getImageReferencesToPublish = (
  workspaceRoot: string,
  projectName: string,
  projectNode: ProjectGraphNodeLike,
  imageReference: string,
) => {
  const metadataTags = getBuildMetadataTags(projectNode);

  if (!metadataTags || metadataTags.length === 0) {
    return [imageReference, getLatestImageReference(imageReference)];
  }

  const runtimeContext = getRuntimeContext(
    workspaceRoot,
    projectName,
    getExplicitImageTag(imageReference),
  );
  const additionalImageReferences = buildMetadataTagArguments(
    [`--tag ${imageReference}`],
    { tags: metadataTags },
    runtimeContext,
  ).map((tagArgument) => tagArgument.replace(/^--tag\s+/u, ""));

  return [imageReference, ...additionalImageReferences];
};

const getDockerVersionDirectoryPath = (workspaceRoot: string, projectRoot: string) =>
  path.join(workspaceRoot, "tmp", projectRoot);

const getDockerVersionFilePath = (workspaceRoot: string, projectRoot: string) =>
  path.join(getDockerVersionDirectoryPath(workspaceRoot, projectRoot), ".docker-version");

const readImageReference = (workspaceRoot: string, projectRoot: string) => {
  // The versioning step persists the final tag so publish can reuse the exact same image reference.
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

const runPublish = (
  imageReference: string,
  imageReferencesToPublish: string[],
  quiet: boolean,
) => {
  // Push the immutable versioned tag first, then derive and push any additional refs from the same local image.
  console.info(`Pushing Docker image ${imageReference}`);
  runDockerCommand(`docker push ${imageReference}`, quiet);

  for (const additionalImageReference of imageReferencesToPublish.slice(1)) {
    console.info(`Tagging Docker image ${additionalImageReference}`);
    runDockerCommand(`docker tag ${imageReference} ${additionalImageReference}`, quiet);

    console.info(`Pushing Docker image ${additionalImageReference}`);
    runDockerCommand(`docker push ${additionalImageReference}`, quiet);
  }
};

const cleanupDockerVersionDirectory = (workspaceRoot: string, projectRoot: string) => {
  rmSync(getDockerVersionDirectoryPath(workspaceRoot, projectRoot), {
    force: true,
    recursive: true,
  });
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

  const projectRoot = projectNode.data.root;
  const imageReference = readImageReference(context.root, projectRoot);
  const imageReferencesToPublish = getImageReferencesToPublish(
    context.root,
    projectName,
    projectNode,
    imageReference,
  );
  // nx release forwards dry-run through NX_DRY_RUN, but the executor also supports direct invocation.
  const dryRun = process.env.NX_DRY_RUN === "true" || options.dryRun === true;
  const quiet = options.quiet ?? false;

  if (dryRun) {
    console.info(
      `Dry run enabled: would push ${imageReferencesToPublish.map((ref) => `'${ref}'`).join(", ")}.`,
    );
    return { success: true };
  }

  assertLocalImageExists(imageReference);
  runPublish(imageReference, imageReferencesToPublish, quiet);
  cleanupDockerVersionDirectory(context.root, projectRoot);

  return { success: true };
};

export default releasePublishExecutor;