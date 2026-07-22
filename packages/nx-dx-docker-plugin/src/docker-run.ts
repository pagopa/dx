// Shared implementation for the `docker:build`/`docker:push` Nx executors
// (see executors/docker-build, executors/docker-push — both are thin
// wrappers around `runDockerCommand` below). Executed at task-RUN time —
// deliberately never at Nx project-graph construction time: the project
// graph (and any target `options` a plugin's `createNodesV2` bakes in) is
// cached keyed off file hashes, not `GITHUB_*` env vars, so computing
// tags/labels/timestamps in the plugin itself would freeze a possibly-stale
// set into that cache. Running this fresh on every executor invocation
// instead matches how `docker/metadata-action` recomputes tags as a
// discrete CI step on every run (see dx/actions/docker-build-push).
import { execFileSync, spawnSync } from "node:child_process";
import { z } from "zod/v4";

import {
  computeImageTags,
  computeReleaseTags,
  getProjectSlug,
} from "./docker-image.ts";
import {
  summarizeDockerFailure,
  summarizeDockerPush,
} from "./github-summary.ts";

const nonEmptyString = z.string().min(1);

export const dockerRunOptionsSchema = z.object({
  contextPath: nonEmptyString.default("."),
  defaultBranch: nonEmptyString,
  dockerfilePath: nonEmptyString,
  imageAuthors: nonEmptyString,
  imageName: nonEmptyString,
  imageUrl: nonEmptyString,
  platform: nonEmptyString.default("linux/amd64,linux/arm64"),
  projectDisplayName: nonEmptyString,
  projectRoot: nonEmptyString,
});

export type DockerRunOptions = z.infer<typeof dockerRunOptionsSchema>;

const getCommitSha = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.env.GITHUB_SHA ?? "unknown";
  }
};

const getAnnotationLevels = (platform: string): string =>
  platform.split(",").filter(Boolean).length > 1 ? "index,manifest" : "manifest";

/**
 * Runs `docker build`/`docker buildx build --push` with full OCI labels and
 * a multi-tag strategy (RFC-DX-076 feature parity with
 * `docker/metadata-action`). Shared by the `docker:build` and `docker:push`
 * executors, which differ only in whether they add the local untagged
 * alias tag (`build`) or `--push`/annotations (`push`).
 *
 * `workspaceRoot` (the executor's `context.root`, not `process.cwd()`) is
 * used as the docker build's `cwd`, so the workspace-relative `contextPath`
 * and `dockerfilePath` always resolve correctly, regardless of the directory
 * an operator happens to invoke `nx` from. Generated targets default to a
 * monorepo-root context (`.`) and `{projectRoot}/Dockerfile`, per
 * RFC-DX-076's Option 4; projects can override either path independently.
 */
export const runDockerCommand = (
  mode: "build" | "push",
  options: DockerRunOptions,
  workspaceRoot: string,
  releaseVersion?: string,
): { readonly success: boolean } => {
  const {
    contextPath,
    defaultBranch,
    dockerfilePath,
    imageAuthors,
    imageName,
    imageUrl,
    platform,
    projectDisplayName,
    projectRoot,
  } = options;

  const tags = releaseVersion
    ? computeReleaseTags(projectDisplayName, releaseVersion)
    : computeImageTags(projectDisplayName, defaultBranch);

  if (releaseVersion && tags.length === 0) {
    console.error(
      `[@pagopa/nx-dx-docker-plugin] '${releaseVersion}' is not a Docker-compatible semantic version for ${projectDisplayName}.`,
    );
    return { success: false };
  }

  if (mode === "push" && tags.length === 0) {
    console.log(
      `[@pagopa/nx-dx-docker-plugin] No CI tags detected for ${imageName} (not running in a GitHub Actions job) — skipping publish.`,
    );
    return { success: true };
  }

  const publishTags = tags.length > 0 ? tags : ["dev"];
  const labels = {
    authors: imageAuthors,
    created: new Date().toISOString(),
    revision: getCommitSha(),
    source: imageUrl,
    title: projectDisplayName,
    url: imageUrl,
  };

  const dockerArgs = [
    "build",
    contextPath,
    "--file",
    dockerfilePath,
    "--platform",
    platform,
  ];

  if (mode === "build") {
    // Untagged local alias kept for `@nx/docker`'s own `docker:run` target
    // (`docker run {args} {imageRef}`). Only added for local builds: with
    // `--push`, buildx pushes *every* `--tag`, and an unqualified name
    // resolves to `docker.io/library/...` (Docker Hub) rather than staying
    // local, which fails without Hub credentials/permissions.
    dockerArgs.push("--tag", getProjectSlug(projectRoot));
  }

  for (const tag of publishTags) {
    dockerArgs.push("--tag", `${imageName}:${tag}`);
  }

  for (const [key, value] of Object.entries(labels)) {
    dockerArgs.push("--label", `org.opencontainers.image.${key}=${value}`);
  }

  dockerArgs.push("--provenance=false");

  if (mode === "push") {
    // Annotations (unlike labels) attach to the OCI index and per-platform
    // manifests, and Docker only writes them through the registry exporter:
    // the Docker Engine's local image store can't even load an image that
    // has annotations (https://docs.docker.com/build/building/annotations/),
    // so this is only safe/possible once `--push` is also set. `index,manifest`
    // mirrors docker/metadata-action's recommended
    // `DOCKER_METADATA_ANNOTATIONS_LEVELS: manifest,index`, so the annotation
    // shows up both on the manifest list and on each per-architecture entry.
    // A single-platform export has no OCI index, so Buildx only accepts
    // manifest annotations in that case.
    dockerArgs.push("--push");
    for (const [key, value] of Object.entries(labels)) {
      dockerArgs.push(
        "--annotation",
        `${getAnnotationLevels(platform)}:org.opencontainers.image.${key}=${value}`,
      );
    }
  }

  const result = spawnSync("docker", dockerArgs, {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DOCKER_BUILDKIT: "1",
      SOURCE_DATE_EPOCH: "0",
    },
    stdio: "inherit",
  });

  const exitCode = result.status ?? 1;
  if (exitCode !== 0) {
    summarizeDockerFailure(projectDisplayName, mode, exitCode);
    return { success: false };
  }

  if (mode === "push") {
    summarizeDockerPush(projectDisplayName, imageName, publishTags);
  }
  return { success: true };
};
