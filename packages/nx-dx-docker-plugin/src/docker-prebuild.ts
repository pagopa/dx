#!/usr/bin/env node
// Used as (part of) `nx.json`'s `release.docker.preVersionCommand`. Nx's own
// `runPreVersionCommand` (see nx/src/command-line/release/version.js) only
// ever injects `NX_DRY_RUN` into this command's env — it never forwards the
// `--projects`/`--groups` filter that was passed to `nx release version`, so
// there's no built-in way to scope this build to "whatever was selected".
//
// This script closes that gap via a convention: if `NX_RELEASE_DOCKER_PROJECTS`
// is set (a comma/space-separated list of project names or patterns, meant to
// be exported alongside `--projects` when invoking `nx release version`), only
// those projects are built. Otherwise it falls back to `nx affected`, which is
// still the right default for CI (where version plans - not an explicit
// `--projects` flag - decide which projects actually get released).
//
// Example (local testing of a single project's release, without waiting on
// unrelated affected projects to rebuild):
//   NX_RELEASE_DOCKER_PROJECTS=dockerapp3 \
//     pnpm exec nx release version --projects=dockerapp3 --dry-run
import { execSync } from "node:child_process";

const main = (): void => {
  const projectsFilter = process.env.NX_RELEASE_DOCKER_PROJECTS;
  const command = projectsFilter
    ? `pnpm nx run-many -t docker:build -p ${projectsFilter}`
    : `pnpm nx affected -t docker:build`;

  console.log(`[@pagopa/nx-dx-docker-plugin] Running: ${command}`);
  execSync(command, { stdio: "inherit" });
};

main();
