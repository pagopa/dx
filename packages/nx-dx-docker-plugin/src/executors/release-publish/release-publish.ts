// Nx executor wired as `nx-release-publish` for projects using the
// *official* Nx Docker release flow (`nx.release.docker.repositoryName` in
// package.json) — see index.ts's `getDockerRepositoryNameOverride`. Wraps
// @nx/docker's own `nx-release-publish` behavior: the official
// `@nx/docker:release-publish` executor only ever pushes a single,
// version-only tag (it reads `tmp/<projectRoot>/.docker-version`, a file
// written by `nx release version` via `docker tag <local-alias>
// <registry>/<repositoryName>:<version>`, and does `docker push` on exactly
// that one reference — see @nx/docker's
// src/release/version-utils.js/handleDockerVersion and
// src/executors/release-publish/release-publish.impl.js). That's why
// projects using the per-project `nx.release.docker.repositoryName`
// override (the *official* Nx Docker release flow) never got `latest` or
// any other dynamic alias tag, even after `computeImageTags`/`docker:push`
// (this plugin's *own* target, used by CI tag-push events) gained that
// logic: `nx release publish` never runs `docker:push`, it runs
// `nx-release-publish` directly.
//
// This executor reads that same `.docker-version` file (so it stays in
// sync with whatever version `nx release version` just decided) and, in
// addition to pushing that primary version tag itself, also computes and
// pushes the alias tags via `computeReleaseTags` (major, major.minor, and
// `latest` when this is the highest released version) — reusing the exact
// same logic `docker:push` already uses for CI tag-push events, so both
// paths agree on what "latest" means.
import type { ExecutorContext, PromiseExecutor } from "@nx/devkit";

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { computeReleaseTags } from "../../docker-image.ts";
import {
  summarizeDockerFailure,
  summarizeDockerPush,
} from "../../github-summary.ts";
import {
  type ReleasePublishExecutorInput,
  releasePublishExecutorSchema,
} from "./schema.ts";

/** Mirrors @nx/docker's own dry-run check (see version-utils.js). */
const isDryRun = (): boolean => {
  const value = process.env.NX_DRY_RUN;
  return Boolean(value) && value !== "false";
};

const splitImageReference = (
  fullImageRef: string,
): { imageBase: string; version: string } => {
  const separatorIndex = fullImageRef.lastIndexOf(":");
  return {
    imageBase: fullImageRef.slice(0, separatorIndex),
    version: fullImageRef.slice(separatorIndex + 1),
  };
};

const runExecutor: PromiseExecutor<ReleasePublishExecutorInput> = async (
  options,
  context: ExecutorContext,
) => {
  const parseResult = releasePublishExecutorSchema.safeParse(options);
  if (!parseResult.success) {
    console.warn(
      "[@pagopa/nx-dx-docker-plugin] Invalid nx-release-publish options:",
      parseResult.error.issues,
    );
    return { success: false };
  }
  const { projectName, projectRoot } = parseResult.data;

  // Matches @nx/docker's own `getDockerVersionPath(workspaceRoot, projectRoot)`.
  const versionFilePath = join(
    context.root,
    "tmp",
    projectRoot,
    ".docker-version",
  );
  if (!existsSync(versionFilePath)) {
    console.error(
      `[@pagopa/nx-dx-docker-plugin] Could not find ${versionFilePath}. Did you run 'nx release version'?`,
    );
    return { success: false };
  }

  const fullImageRef = readFileSync(versionFilePath, "utf8").trim();
  const { imageBase, version } = splitImageReference(fullImageRef);
  const aliasTags = computeReleaseTags(projectName, version).filter(
    (tag) => tag !== version,
  );

  if (isDryRun()) {
    console.log(
      `Docker Image ${fullImageRef} was not pushed as --dry-run is enabled.`,
    );
    for (const tag of aliasTags) {
      console.log(
        `Docker Image ${imageBase}:${tag} was not tagged/pushed as --dry-run is enabled.`,
      );
    }
    return { success: true };
  }

  try {
    execFileSync("docker", ["push", fullImageRef], { stdio: "inherit" });
    console.log(`Successfully pushed ${fullImageRef}`);

    for (const tag of aliasTags) {
      const aliasRef = `${imageBase}:${tag}`;
      execFileSync("docker", ["tag", fullImageRef, aliasRef], {
        stdio: "inherit",
      });
      execFileSync("docker", ["push", aliasRef], { stdio: "inherit" });
      console.log(`Successfully pushed ${aliasRef}`);
    }
  } catch (err) {
    summarizeDockerFailure(projectName, "push", 1);
    console.error("[@pagopa/nx-dx-docker-plugin] Docker push failed:", err);
    return { success: false };
  }

  summarizeDockerPush(projectName, imageBase, [version, ...aliasTags]);
  return { success: true };
};

export default runExecutor;
