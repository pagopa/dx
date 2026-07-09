#!/usr/bin/env node
// Executed at task-RUN time — deliberately never at Nx project-graph
// construction time. Nx's project graph (and any target `args` baked in by
// a plugin's `createNodesV2`) is cached keyed off file hashes, not off
// `GITHUB_*` env vars, so computing tags/labels/timestamps in the plugin
// itself would freeze a possibly-stale set into that cache. Running this
// script fresh on every invocation instead matches how
// `docker/metadata-action` recomputes tags as a discrete CI step on every
// run (see dx/actions/docker-build-push).
import { execFileSync, spawnSync } from "node:child_process";

import { parseArgs } from "./cli-args.ts";
import { computeImageTags, getProjectSlug } from "./docker-image.ts";
import {
  summarizeDockerFailure,
  summarizeDockerPush,
} from "./github-summary.ts";

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

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.mode;
  if (mode !== "build" && mode !== "push") {
    console.error(
      `[@pagopa/nx-dx-docker-plugin] Invalid --mode: ${mode} (expected "build" or "push").`,
    );
    process.exit(1);
  }
  const projectRoot = args["project-root"];
  const projectDisplayName = args["project-display-name"];
  const imageName = args["image-name"];
  const defaultBranch = args["default-branch"];
  const imageAuthors = args["image-authors"];
  const imageUrl = args["image-url"];

  const tags = computeImageTags(projectDisplayName, defaultBranch);

  if (mode === "push" && tags.length === 0) {
    console.log(
      `[@pagopa/nx-dx-docker-plugin] No CI tags detected for ${imageName} (not running in a GitHub Actions job) — skipping publish.`,
    );
    process.exit(0);
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
    ".",
    "--file",
    `${projectRoot}/Dockerfile`,
    "--platform",
    "linux/amd64,linux/arm64",
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
    dockerArgs.push("--push");
    for (const [key, value] of Object.entries(labels)) {
      dockerArgs.push(
        "--annotation",
        `index,manifest:org.opencontainers.image.${key}=${value}`,
      );
    }
  }

  const result = spawnSync("docker", dockerArgs, {
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
  } else if (mode === "push") {
    summarizeDockerPush(projectDisplayName, imageName, publishTags);
  }

  process.exit(exitCode);
};

main();
