#!/usr/bin/env node
// Wraps @nx/docker's own `nx-release-publish` behavior: the official
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
// This script reads that same `.docker-version` file (so it stays in sync
// with whatever version `nx release version` just decided) and, in
// addition to pushing that primary version tag itself, also computes and
// pushes the alias tags via `computeReleaseTags` (major, major.minor, and
// `latest` when this is the highest released version) — reusing the exact
// same logic `docker:push` already uses for CI tag-push events, so both
// paths agree on what "latest" means.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseArgs } from "./cli-args.ts";
import { computeReleaseTags } from "./docker-image.ts";

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

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = args["project-root"];
  const projectName = args["project-name"];
  if (!projectRoot || !projectName) {
    console.error(
      "[@pagopa/nx-dx-docker-plugin] --project-root and --project-name are required.",
    );
    process.exit(1);
  }

  // Matches @nx/docker's own `getDockerVersionPath(workspaceRoot, projectRoot)`;
  // `nx:run-commands` executors run with cwd = workspace root by default.
  const versionFilePath = join(
    process.cwd(),
    "tmp",
    projectRoot,
    ".docker-version",
  );
  if (!existsSync(versionFilePath)) {
    console.error(
      `[@pagopa/nx-dx-docker-plugin] Could not find ${versionFilePath}. Did you run 'nx release version'?`,
    );
    process.exit(1);
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
    return;
  }

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
};

main();
