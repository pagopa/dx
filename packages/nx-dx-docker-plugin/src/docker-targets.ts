// Builds the `docker:build`/`docker:push` Nx targets: thin
// `TargetConfiguration` wiring for the `@pagopa/nx-dx-docker-plugin:build`/
// `:push` executors (see docker-run.ts for the actual logic). Both targets
// share the exact same options — everything env-dependent (tags, commit
// sha, build timestamp) is computed inside the executor at task-RUN time,
// fresh on every run, never here at graph-construction time. Baking those
// into this module (i.e. into the target definitions Nx caches as part of
// the project graph) would freeze whatever `GITHUB_*` env vars happened to
// be set when the graph was last (re)computed — the graph cache is keyed
// off file hashes, not env vars — instead of genuinely recomputing them on
// every run, the way `docker/metadata-action` does as a discrete CI step
// (see dx/actions/docker-build-push).
//
// This plugin owns the whole `docker:build`/`docker:push` targets (rather
// than layering extra options on top of `@nx/docker`'s own inferred
// targets) because Nx target-merging replaces an inferred target's
// `options` wholesale, key-by-key, when a later-registered plugin also
// contributes the same key — a plugin-ordering footgun this sidesteps by
// keeping a single, fully self-contained source of truth. `@nx/docker` is
// still registered in `nx.json` for the `docker:run` convenience target.
import type { TargetConfiguration } from "@nx/devkit";

import type { DockerRunOptions } from "./docker-run.ts";

export const buildDockerBuildTarget = (
  options: DockerRunOptions,
): TargetConfiguration => ({
  executor: "@pagopa/nx-dx-docker-plugin:build",
  metadata: {
    description:
      "Build this project's Docker image locally with full OCI labels, computed fresh on every run (RFC-DX-076 feature parity with docker/metadata-action)",
    technologies: ["container-image"],
  },
  options,
});

export const buildDockerPushTarget = (
  options: DockerRunOptions,
  buildTargetName: string,
): TargetConfiguration => ({
  dependsOn: [buildTargetName],
  executor: "@pagopa/nx-dx-docker-plugin:push",
  metadata: {
    description:
      "Build and push this project's Docker image with full OCI labels and index+manifest annotations; no-ops when there's nothing CI-computed to publish",
    technologies: ["container-image"],
  },
  options,
});
