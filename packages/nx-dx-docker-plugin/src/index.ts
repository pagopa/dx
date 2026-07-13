// Nx plugin implementing RFC-DX-076's decision: `@nx/docker` remains the
// official base plugin for the `docker:run` convenience target and the
// `nx-release-publish` executor, while this plugin owns:
//
// - the `docker:build`/`docker:push` targets for every project with a
//   Dockerfile, to reach feature parity with `docker/metadata-action`
//   (full OCI labels, multi-tag strategy, provenance/reproducibility flags —
//   see docker-targets.ts for the rationale on why this plugin owns the
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

import { getImageName, getProjectDisplayName } from "./docker-image.ts";
import {
  buildDockerBuildTarget,
  buildDockerPushTarget,
} from "./docker-targets.ts";
import {
  type DockerPluginOptions,
  parseDockerReleasePluginOptions,
} from "./options.ts";

const dockerfileGlob = "**/Dockerfile";

interface ProjectPackageJson {
  readonly name?: string;
  readonly nx?: {
    readonly docker?: {
      readonly contextPath?: string;
      readonly dockerfilePath?: string;
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
 * Detects the *official* Nx Docker release flow's per-project override
 * (`nx.release.docker.repositoryName` in package.json). Projects using it
 * get their `nx-release-publish` target overridden to also push the
 * dynamic alias tags (see executors/release-publish), since
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
 * An optional `nx.docker.repositoryName` customizes only this plugin's
 * `docker:build`/`docker:push` image name. Otherwise, reuse Nx Release's
 * `nx.release.docker.repositoryName`, keeping one repository setting for
 * projects that use both build and release flows.
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
  return (
    packageJson.nx?.docker?.repositoryName ??
    packageJson.nx?.release?.docker?.repositoryName ??
    null
  );
};

/**
 * Resolves the project-level Docker build layout. Both values are relative
 * to the workspace root because executors always run Docker from
 * `context.root`; this keeps Docker COPY paths deterministic in monorepos.
 */
const getBuildLayoutOverrides = (
  workspaceRoot: string,
  projectRoot: string,
): { readonly contextPath: string; readonly dockerfilePath: string } => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return { contextPath: ".", dockerfilePath: `${projectRoot}/Dockerfile` };
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return {
    contextPath: packageJson.nx?.docker?.contextPath ?? ".",
    dockerfilePath:
      packageJson.nx?.docker?.dockerfilePath ?? `${projectRoot}/Dockerfile`,
  };
};

export const createDockerReleaseNodes = (
  projectRoot: string,
  options: DockerPluginOptions,
  context: CreateNodesContextV2,
) => {
  const targets: Record<string, TargetConfiguration> = {};

  const projectDisplayName = getProjectDisplayName(
    context.workspaceRoot,
    projectRoot,
  );
  const imageName = getImageName(
    options.registry,
    options.imageNamePrefix,
    projectDisplayName,
    getBuildImageRepositoryNameOverride(context.workspaceRoot, projectRoot) ??
      undefined,
  );

  const dockerRunOptions = {
    ...getBuildLayoutOverrides(context.workspaceRoot, projectRoot),
    defaultBranch: options.defaultBranch,
    imageAuthors: options.imageAuthors,
    imageName,
    imageUrl: options.imageUrl,
    platform: options.platform,
    projectDisplayName,
    projectRoot,
  };

  targets[options.buildTargetName] = buildDockerBuildTarget(dockerRunOptions);

  // Always exposed: tags are resolved at task-run time (see docker-run.ts),
  // not here at graph-construction time, so we can't know yet whether
  // there'll be anything CI-computed to publish. docker-run.ts no-ops
  // cleanly when it isn't running in CI.
  targets[options.pushTargetName] = buildDockerPushTarget(
    dockerRunOptions,
    options.buildTargetName,
  );

  if (
    getDockerRepositoryNameOverride(context.workspaceRoot, projectRoot) !== null
  ) {
    targets["nx-release-publish"] = {
      executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      metadata: {
        description:
          "Push this release's version tag plus major/major.minor/latest alias tags (RFC-DX-076 feature parity with docker/metadata-action)",
        technologies: ["docker"],
      },
      options: {
        projectName: projectDisplayName,
        projectRoot,
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
