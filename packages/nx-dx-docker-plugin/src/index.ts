// Nx plugin implementing RFC-DX-076's Docker target inference. This plugin
// owns the build, push, run, and release-publish targets:
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

import { getBuildLayoutOverrides } from "./docker-build-layout.ts";
import {
  getImageName,
  getProjectDisplayName,
  getProjectSlug,
} from "./docker-image.ts";
import {
  buildDockerBuildTarget,
  buildDockerPushTarget,
} from "./docker-targets.ts";
import {
  type DockerPluginOptions,
  parseDockerReleasePluginOptions,
} from "./options.ts";

const dockerfileGlob = "**/Dockerfile";

interface ProjectJson {
  readonly metadata?: {
    readonly docker?: {
      readonly repositoryName?: string;
    };
  };
}

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
  readonly release?: {
    readonly docker?: {
      readonly repositoryName?: string;
    };
  };
}

const getProjectJson = (
  workspaceRoot: string,
  projectRoot: string,
): null | ProjectJson => {
  const projectJsonPath = join(workspaceRoot, projectRoot, "project.json");
  return existsSync(projectJsonPath)
    ? readJsonFile<ProjectJson>(projectJsonPath)
    : null;
};

/**
 * Detects a per-project Docker release override
 * (`nx.release.docker.repositoryName` in package.json). Projects using it
 * get an `nx-release-publish` target that pushes the dynamic alias tags.
 */
const getDockerRepositoryNameOverride = (
  workspaceRoot: string,
  projectRoot: string,
): null | string => {
  const packageJsonPath = join(workspaceRoot, projectRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return (
      getProjectJson(workspaceRoot, projectRoot)?.metadata?.docker
        ?.repositoryName ?? null
    );
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return (
    packageJson.nx?.release?.docker?.repositoryName ??
    packageJson.release?.docker?.repositoryName ??
    null
  );
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
    return (
      getProjectJson(workspaceRoot, projectRoot)?.metadata?.docker
        ?.repositoryName ?? null
    );
  }
  const packageJson = readJsonFile<ProjectPackageJson>(packageJsonPath);
  return (
    packageJson.nx?.docker?.repositoryName ??
    packageJson.nx?.release?.docker?.repositoryName ??
    packageJson.release?.docker?.repositoryName ??
    null
  );
};

export const createDockerReleaseNodes = (
  projectRoot: string,
  options: DockerPluginOptions,
  context: Pick<CreateNodesContextV2, "workspaceRoot">,
) => {
  const targets: Record<string, TargetConfiguration> = {};
  const buildLayout = getBuildLayoutOverrides(
    context.workspaceRoot,
    projectRoot,
  );

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
    ...buildLayout,
    defaultBranch: options.defaultBranch,
    imageAuthors: options.imageAuthors,
    imageName,
    imageUrl: options.imageUrl,
    platform: buildLayout.platform ?? options.platform,
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

  targets["docker:run"] = {
    command: `docker run {args} ${getProjectSlug(projectRoot)}`,
    dependsOn: [options.buildTargetName],
    metadata: {
      description: "Run this project's locally built Docker image",
      technologies: ["container-image"],
    },
    options: {
      cwd: projectRoot,
    },
  };

  if (
    getDockerRepositoryNameOverride(context.workspaceRoot, projectRoot) !== null
  ) {
    targets["nx-release-publish"] = {
      continuous: false,
      executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      metadata: {
        description:
          "Push this release's version tag plus major/major.minor/latest alias tags (RFC-DX-076 feature parity with docker/metadata-action)",
        technologies: ["container-image"],
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
