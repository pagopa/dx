// Builds the `docker:build`/`docker:push` Nx targets. Both just invoke
// run-docker.js at task-run time: everything env-dependent (tags, commit
// sha, build timestamp) is computed there, fresh on every run, never here.
// Baking those into this module (i.e. into the target definitions Nx caches
// as part of the project graph) would freeze whatever `GITHUB_*` env vars
// happened to be set when the graph was last (re)computed — the graph cache
// is keyed off file hashes, not env vars — instead of genuinely recomputing
// them on every run, the way `docker/metadata-action` does as a discrete CI
// step (see dx/actions/docker-build-push). This module only wires the
// static, graph-time-safe values (project root, display name, image name,
// options) into the command line.
//
// This plugin owns the whole `docker:build`/`docker:push` targets (rather
// than layering extra `args` on top of `@nx/docker`'s own inferred targets)
// because Nx target-merging replaces `options.args`/`command` wholesale when
// a later-registered plugin also contributes it — a partial merge isn't
// possible, so this keeps a single, fully self-contained source of truth.
// `@nx/docker` is still registered in `nx.json` for the `docker:run`
// convenience target and the `nx-release-publish` executor.
//
// Points at `dist/run-docker.js`, not `src/run-docker.ts`: this command
// string is invoked directly as a `node` CLI process at task-run time, not
// loaded through Nx's own plugin transpiler, so it must be plain,
// already-built JS (see this package's README for the build requirement).
import type { TargetConfiguration } from "@nx/devkit";

const RUN_DOCKER_SCRIPT = "packages/nx-dx-docker-plugin/dist/run-docker.js";

const quoteArg = (value: string): string =>
  /\s/.test(value) ? `"${value}"` : value;

interface DockerCommandOptions {
  readonly defaultBranch: string;
  readonly imageAuthors: string;
  readonly imageUrl: string;
}

const buildRunDockerCommand = (
  mode: "build" | "push",
  projectRoot: string,
  projectDisplayName: string,
  imageName: string,
  options: DockerCommandOptions,
): string => {
  const args = [
    `--mode=${mode}`,
    `--project-root=${projectRoot}`,
    `--project-display-name=${quoteArg(projectDisplayName)}`,
    `--image-name=${imageName}`,
    `--default-branch=${options.defaultBranch}`,
    `--image-authors=${quoteArg(options.imageAuthors)}`,
    `--image-url=${options.imageUrl}`,
  ];
  return `node ${RUN_DOCKER_SCRIPT} ${args.join(" ")}`;
};

export const buildDockerBuildTarget = (
  projectRoot: string,
  projectDisplayName: string,
  imageName: string,
  options: DockerCommandOptions,
): TargetConfiguration => ({
  command: buildRunDockerCommand(
    "build",
    projectRoot,
    projectDisplayName,
    imageName,
    options,
  ),
  metadata: {
    description:
      "Build this project's Docker image locally with full OCI labels, computed fresh on every run (RFC-DX-076 feature parity with docker/metadata-action)",
    technologies: ["docker"],
  },
});

export const buildDockerPushTarget = (
  projectRoot: string,
  projectDisplayName: string,
  imageName: string,
  options: DockerCommandOptions,
  buildTargetName: string,
): TargetConfiguration => ({
  command: buildRunDockerCommand(
    "push",
    projectRoot,
    projectDisplayName,
    imageName,
    options,
  ),
  dependsOn: [buildTargetName],
  metadata: {
    description:
      "Build and push this project's Docker image with full OCI labels and index+manifest annotations; no-ops when there's nothing CI-computed to publish",
    technologies: ["docker"],
  },
});
