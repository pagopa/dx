// Nx plugin implementing RFC-DX-076's decision: `@nx/docker` remains the
// official base plugin for the `docker:run` convenience target and the
// `nx-release-publish` executor, while this plugin owns:
//
// - a `package` target (dependsOn the JS/TS build target) for any project
//   that has both a Dockerfile and a JS/TS build target, so individual
//   projects no longer need to hand-declare it;
// - the `docker:build`/`docker:push` targets for *every* project with a
//   Dockerfile, to reach feature parity with `docker/metadata-action`
//   (full OCI labels, multi-tag strategy, provenance/reproducibility flags —
//   see docker-build-target.ts for the rationale on why this plugin owns the
//   whole target instead of layering on top of `@nx/docker`'s own).
import {
  type CreateNodesContextV2,
  createNodesFromFiles,
  type CreateNodesV2,
  readJsonFile,
  type TargetConfiguration,
} from "@nx/devkit";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  buildDockerBuildTarget,
  buildDockerPushTarget,
} from "./docker-build-target.ts";
import { getImageName, getProjectDisplayName } from "./docker-image.ts";
import {
  type DockerPluginOptions,
  parseDockerReleasePluginOptions,
} from "./options.ts";
import { buildPackageTarget } from "./package-target.ts";

const dockerfileGlob = "**/Dockerfile";

interface ProjectJson {
  readonly targets?: Record<string, unknown>;
}

interface ProjectPackageJson {
  readonly name?: string;
  readonly nx?: {
    readonly docker?: {
      readonly repositoryName?: string;
    };
    readonly release?: {
      readonly docker?: {
        readonly repositoryName?: string;
      };
    };
  };
}

/**
 * A project is eligible for the generated `package` target only if it
 * already produces a JS/TS build output through Nx. This repo's convention
 * for that is either an explicit target in `project.json`, or an inferred
 * `build` target via `@nx/js/typescript` (signaled by a `tsconfig.lib.json`).
 */
export const hasJsBuildTarget = (
  workspaceRoot: string,
  projectRoot: string,
  jsBuildTargetName: string,
): boolean => {
  const projectJsonPath = join(workspaceRoot, projectRoot, "project.json");
  if (existsSync(projectJsonPath)) {
    const projectJson = readJsonFile<ProjectJson>(projectJsonPath);
    if (projectJson.targets?.[jsBuildTargetName]) {
      return true;
    }
  }

  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  const tsconfigLibPath = join(workspaceRoot, projectRoot, "tsconfig.lib.json");
  return existsSync(packageJsonPath) && existsSync(tsconfigLibPath);
};

export const getProjectName = (
  workspaceRoot: string,
  projectRoot: string,
): string => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  if (!packageJson.name) {
    throw new Error(
      `Unable to resolve a package name for project at ${projectRoot}; a package.json with a "name" field is required to build the "package" target.`,
    );
  }
  return packageJson.name;
};

/**
 * Detects the *official* Nx Docker release flow's per-project override
 * (`nx.release.docker.repositoryName` in package.json). Projects using it
 * get their `nx-release-publish` target overridden to also push the
 * dynamic alias tags (see publish-docker-release.ts), since
 * `@nx/docker:release-publish` on its own only ever pushes a single
 * version-only tag.
 */
const getDockerRepositoryNameOverride = (
  workspaceRoot: string,
  projectRoot: string,
): null | string => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return packageJson.nx?.release?.docker?.repositoryName ?? null;
};

/**
 * Distinct from `getDockerRepositoryNameOverride` above: this only affects
 * the `imageName` this plugin computes for its own `docker:build`/
 * `docker:push` targets, never the `nx-release-publish` executor.
 */
const getBuildImageRepositoryNameOverride = (
  workspaceRoot: string,
  projectRoot: string,
): null | string => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return packageJson.nx?.docker?.repositoryName ?? null;
};

export const createDockerReleaseNodes = (
  projectRoot: string,
  options: DockerPluginOptions,
  context: CreateNodesContextV2,
) => {
  const targets: Record<string, TargetConfiguration> = {};

  if (
    hasJsBuildTarget(
      context.workspaceRoot,
      projectRoot,
      options.jsBuildTargetName,
    )
  ) {
    const projectName = getProjectName(context.workspaceRoot, projectRoot);
    targets[options.packageTargetName] = buildPackageTarget(
      projectRoot,
      projectName,
      options.jsBuildTargetName,
    );
  }

  const projectDisplayName = getProjectDisplayName(
    context.workspaceRoot,
    projectRoot,
  );
  const imageName = getImageName(
    options.registry,
    options.imageNamePrefix,
    projectRoot,
    getBuildImageRepositoryNameOverride(context.workspaceRoot, projectRoot) ??
      undefined,
  );

  targets[options.buildTargetName] = buildDockerBuildTarget(
    projectRoot,
    projectDisplayName,
    imageName,
    options,
  );

  // Always exposed: tags are resolved at task-run time (see run-docker.ts),
  // not here at graph-construction time, so we can't know yet whether
  // there'll be anything CI-computed to publish. run-docker.ts no-ops
  // cleanly when it isn't running in CI.
  targets[options.pushTargetName] = buildDockerPushTarget(
    projectRoot,
    projectDisplayName,
    imageName,
    options,
    options.buildTargetName,
  );

  if (
    getDockerRepositoryNameOverride(context.workspaceRoot, projectRoot) !== null
  ) {
    targets["nx-release-publish"] = {
      executor: "nx:run-commands",
      metadata: {
        description:
          "Push this release's version tag plus major/major.minor/latest alias tags (RFC-DX-076 feature parity with docker/metadata-action)",
        technologies: ["docker"],
      },
      options: {
        command: `node packages/nx-dx-docker-plugin/dist/publish-docker-release.js --project-root=${projectRoot} --project-name=${projectDisplayName}`,
      },
    };
  }

  return {
    projects: {
      [projectRoot]: {
        root: projectRoot,
        targets,
      },
    },
  };
};

export const createNodesV2: CreateNodesV2<DockerPluginOptions> = [
  dockerfileGlob,
  async (configFilePaths, options, context) => {
    const parsedOptions = parseDockerReleasePluginOptions(
      options,
      context.workspaceRoot,
    );
    return createNodesFromFiles(
      (configFilePath, _options, nodeContext) =>
        createDockerReleaseNodes(
          dirname(configFilePath),
          parsedOptions,
          nodeContext,
        ),
      configFilePaths,
      options,
      context,
    );
  },
];
