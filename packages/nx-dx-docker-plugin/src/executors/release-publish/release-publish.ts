/** Publishes a release Docker image directly from the released package version. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod/v4";

import { computeReleaseTags } from "../../docker-image.ts";
import { runDockerCommand } from "../../docker-run.ts";
import { releasePublishSchema } from "./schema.ts";

export interface DockerPublishExecutorContext {
  root: string;
}

const packageJsonSchema = z.object({
  version: z.string().trim().min(1),
});

const projectJsonSchema = z.object({
  metadata: z.object({
    version: z.string().trim().min(1),
  }),
});

const readJson = async (filePath: string): Promise<unknown> => {
  const content = await readFile(filePath, "utf8");

  try {
    return JSON.parse(content);
  } catch (cause) {
    throw new Error(`Could not parse ${filePath}.`, { cause });
  }
};

const isFileNotFound = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const readReleasedVersion = async (
  workspaceRoot: string,
  projectRoot: string,
): Promise<{ readonly sourcePath: string; readonly version: string }> => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  try {
    const parseResult = packageJsonSchema.safeParse(
      await readJson(packageJsonPath),
    );
    if (!parseResult.success) {
      throw new Error(`Could not read a version from ${packageJsonPath}.`, {
        cause: parseResult.error,
      });
    }

    return {
      sourcePath: `${projectRoot}/package.json`,
      version: parseResult.data.version,
    };
  } catch (error) {
    if (!isFileNotFound(error)) {
      throw error;
    }
  }

  const projectJsonPath = join(workspaceRoot, projectRoot, "project.json");
  const parseResult = projectJsonSchema.safeParse(
    await readJson(projectJsonPath),
  );
  if (!parseResult.success) {
    throw new Error(
      `Could not read a version from ${projectJsonPath} metadata.version.`,
      { cause: parseResult.error },
    );
  }

  return {
    sourcePath: `${projectRoot}/project.json`,
    version: parseResult.data.metadata.version,
  };
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
  const release = await readReleasedVersion(context.root, options.projectRoot);
  const releaseTags = computeReleaseTags(
    options.projectDisplayName,
    release.version,
  );
  if (releaseTags.length === 0) {
    throw new Error(
      `Version '${release.version}' in ${release.sourcePath} is not Docker-compatible semantic version.`,
    );
  }

  // nx release forwards dry-run through NX_DRY_RUN, but the executor also supports direct invocation.
  const dryRun = process.env.NX_DRY_RUN === "true" || options.dryRun === true;

  if (dryRun) {
    console.info(
      `Dry run enabled: would build and push '${options.imageName}' with tags ${releaseTags.join(", ")}.`,
    );
    return { success: true };
  }

  return runDockerCommand("push", options, context.root, release.version);
};

export default releasePublishExecutor;
