/**
 * Wraps Nx Docker target inference with DX-specific build context, Dockerfile, and label defaults.
 */
import {
  createNodesV2 as baseCreateNodesV2,
  type DockerPluginOptions as NxDockerPluginOptions,
} from "@nx/docker";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { getDockerBuildContext, getDockerfileArgument } from "./discovery.ts";
import {
  getAutomaticDockerLabelArgs,
  getDefaultDockerImageAuthors,
} from "./metadata.ts";
import {
  type DockerBuildMetadataOptions,
  type DockerPluginOptions,
  parseOptions,
} from "./options.ts";

type CreateNodesTuple = readonly [
  string,
  {
    projects?: Record<
      string,
      {
        root?: string;
        targets?: Record<
          string,
          { executor?: string; options?: Record<string, unknown> }
        >;
      }
    >;
  },
];

const getProjectNameFromPath = (projectRoot: string, workspaceRoot: string) => {
  // Nx only gives us a config file path here, so derive a stable fallback name for labels.
  const root = projectRoot === "." ? workspaceRoot : projectRoot;
  const normalizedProjectRoot = root
    .replace(/^[\\/]/, "")
    .replace(/[\\/\s]+/g, "-")
    .toLowerCase();

  return normalizedProjectRoot.length > 128
    ? normalizedProjectRoot.slice(-128)
    : normalizedProjectRoot;
};

const normalizeArgs = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeMetadata = (
  value: DockerBuildMetadataOptions | undefined,
): DockerBuildMetadataOptions | undefined => {
  if (!value) {
    return undefined;
  }

  const labels = Array.isArray(value.labels)
    ? value.labels.filter((item): item is string => typeof item === "string")
    : undefined;
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((item): item is string => typeof item === "string")
    : undefined;

  if ((!labels || labels.length === 0) && (!tags || tags.length === 0)) {
    return undefined;
  }

  return {
    ...(labels && labels.length > 0 ? { labels } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
  };
};

const stripMetadataFromBuildTarget = (
  target: DockerPluginOptions["buildTarget"],
): NxDockerPluginOptions["buildTarget"] => {
  // metadata is a wrapper-only extension; strip it before delegating so upstream Nx Docker
  // still receives the option shape it knows how to infer from.
  if (typeof target === "string" || target === undefined) {
    return target;
  }

  const { configurations, metadata: _metadata, ...rest } = target;

  if (!configurations) {
    return rest;
  }

  return {
    ...rest,
    configurations: Object.fromEntries(
      Object.entries(configurations).map(([configurationName, configuration]) => {
        const { metadata: _configurationMetadata, ...configurationRest } = configuration;
        return [configurationName, configurationRest];
      }),
    ),
  };
};

const getBuildTargetMetadata = (
  target: DockerPluginOptions["buildTarget"],
  configurationName?: string,
) => {
  if (typeof target === "string" || target === undefined) {
    return undefined;
  }

  if (configurationName) {
    return normalizeMetadata(target.configurations?.[configurationName]?.metadata);
  }

  return normalizeMetadata(target.metadata);
};

const normalizeEnv = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
};

const normalizeTargetForNx = (
  target: NxDockerPluginOptions["buildTarget"],
  defaultName: string,
): NxDockerPluginOptions["buildTarget"] => {
  if (typeof target === "string" || target === undefined) {
    return target;
  }

  return {
    ...target,
    name: target.name ?? defaultName,
  };
};

const removeExistingFileArgs = (args: string[]) =>
  args.filter((arg) => !arg.startsWith("--file ") && !arg.startsWith("-f "));

const removeExistingTagArgs = (args: string[]) =>
  args.filter((arg) => !arg.startsWith("--tag ") && !arg.startsWith("-t "));

const removeExistingPlatformArgs = (args: string[]) =>
  args.filter((arg) => !arg.startsWith("--platform "));

const removeExistingLabelArgs = (args: string[]) =>
  args.filter(
    (arg) =>
      !arg.startsWith("--label org.opencontainers.image.") &&
      arg !== "--provenance=false",
  );

const dockerReleasePublishTargetName = "docker-release-publish";
const nxReleasePublishTargetName = "nx-release-publish";

const dockerReleasePublishExecutors = new Set([
  "@nx/docker:release-publish",
  "@pagopa/nx-dx-docker-plugin:release-publish",
]);

type TargetDependency = string | { target: string; params?: string };

type InferredTarget = {
  configurations?: Record<string, unknown>;
  dependsOn?: TargetDependency[];
  executor?: string;
  options?: Record<string, unknown>;
  parallelism?: boolean;
  [key: string]: unknown;
};

const isDockerReleasePublishExecutor = (executor: string | undefined) =>
  executor ? dockerReleasePublishExecutors.has(executor) : false;

const patchNxReleasePublishTarget = (nxReleasePublishTarget: InferredTarget | undefined) => {
  if (!nxReleasePublishTarget) {
    return {
      executor: "nx:noop",
    };
  }

  if (isDockerReleasePublishExecutor(nxReleasePublishTarget.executor)) {
    return {
      ...nxReleasePublishTarget,
      executor: "nx:noop",
    };
  }

  return nxReleasePublishTarget.executor
    ? nxReleasePublishTarget
    : {
        ...nxReleasePublishTarget,
        executor: "nx:noop",
      };
};

type InferredTargetOptions = {
  args?: unknown;
  env?: unknown;
  metadata?: unknown;
};

type InferredBuildTarget = {
  command?: string;
  configurations?: Record<string, InferredTargetOptions>;
  executor?: string;
  options?: InferredTargetOptions;
  [key: string]: unknown;
};

type DockerReleaseCoordinates = {
  registryUrl?: string;
  repositoryName: string;
};

const readJsonFileIfExists = (filePath: string) => {
  if (!existsSync(filePath)) {
    return null;
  }

  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
};

const readDockerReleaseCoordinates = (
  workspaceRoot: string,
  projectRoot: string,
): DockerReleaseCoordinates | null => {
  const normalizedProjectRoot = projectRoot === "." ? "" : projectRoot;
  // Projects can declare Docker release coordinates in either project.json or package.json.
  // Read both so inferred build tags stay aligned with the publish configuration.
  const candidateFiles = [
    path.join(workspaceRoot, normalizedProjectRoot, "project.json"),
    path.join(workspaceRoot, normalizedProjectRoot, "package.json"),
  ];

  for (const candidateFile of candidateFiles) {
    const data = readJsonFileIfExists(candidateFile);
    const release = data?.release;

    if (!release || typeof release !== "object") {
      continue;
    }

    const docker = (release as { docker?: unknown }).docker;

    if (!docker || typeof docker !== "object") {
      continue;
    }

    const repositoryName = (docker as { repositoryName?: unknown }).repositoryName;

    if (typeof repositoryName !== "string" || repositoryName.trim().length === 0) {
      continue;
    }

    const registryUrl = (docker as { registryUrl?: unknown }).registryUrl;

    return {
      repositoryName: repositoryName.trim(),
      ...(typeof registryUrl === "string" && registryUrl.trim().length > 0
        ? { registryUrl: registryUrl.trim().replace(/\/+$/u, "") }
        : {}),
    };
  }

  return null;
};

const resolveBaseImageReference = (
  workspaceRoot: string,
  projectRoot: string,
  fallbackImageReference: string,
) => {
  const dockerReleaseCoordinates = readDockerReleaseCoordinates(workspaceRoot, projectRoot);

  if (!dockerReleaseCoordinates) {
    return fallbackImageReference;
  }

  const { repositoryName, registryUrl } = dockerReleaseCoordinates;

  if (!registryUrl) {
    return repositoryName;
  }

  return repositoryName.startsWith(`${registryUrl}/`)
    ? repositoryName
    : `${registryUrl}/${repositoryName}`;
};

const readProjectBuildPlatform = (
  workspaceRoot: string,
  projectRoot: string,
  buildTargetName: string,
) => {
  const normalizedProjectRoot = projectRoot === "." ? "" : projectRoot;
  const projectJson = readJsonFileIfExists(
    path.join(workspaceRoot, normalizedProjectRoot, "project.json"),
  );
  const packageJson = readJsonFileIfExists(
    path.join(workspaceRoot, normalizedProjectRoot, "package.json"),
  );
  const platformCandidates = [
    projectJson?.targets,
    packageJson?.nx && typeof packageJson.nx === "object"
      ? (packageJson.nx as { targets?: unknown }).targets
      : undefined,
  ];

  for (const targets of platformCandidates) {
    if (!targets || typeof targets !== "object") {
      continue;
    }

    const target = (targets as Record<string, unknown>)[buildTargetName];

    if (!target || typeof target !== "object") {
      continue;
    }

    const options = (target as { options?: unknown }).options;

    if (!options || typeof options !== "object") {
      continue;
    }

    const platform = (options as { platform?: unknown }).platform;

    if (typeof platform === "string" && platform.trim().length > 0) {
      return platform.trim();
    }
  }

  return undefined;
};

const patchBuildTargetOptions = (
  workspaceRoot: string,
  projectRoot: string,
  projectName: string,
  buildTargetName: string,
  dockerfilePath: string,
  targetOptions: InferredTargetOptions | undefined,
  authors: string,
  metadata: DockerBuildMetadataOptions | undefined,
) => {
  const buildContext = getDockerBuildContext(
    workspaceRoot,
    projectRoot,
    dockerfilePath,
  );
  const dockerfileArgument = getDockerfileArgument(
    buildContext,
    dockerfilePath,
  );
  const existingOptions = targetOptions ?? {};
  const existingEnv = normalizeEnv(existingOptions.env);
  const existingArgs = normalizeArgs(existingOptions.args);
  const projectBuildPlatform = readProjectBuildPlatform(
    workspaceRoot,
    projectRoot,
    buildTargetName,
  );
  // @nx/docker may infer a path-based fallback tag; when release.docker coordinates exist,
  // replace that fallback so build, version, and publish all refer to the same repository.
  const existingTagArgument = existingArgs.find(
    (arg) => arg.startsWith("--tag ") || arg.startsWith("-t "),
  );
  const fallbackImageReference = existingTagArgument
    ?.replace(/^--tag\s+/u, "")
    .replace(/^-t\s+/u, "")
    .trim();
  const baseImageReference = fallbackImageReference
    ? resolveBaseImageReference(workspaceRoot, projectRoot, fallbackImageReference)
    : null;
  const argsBeforeLabelAndFileRewrite = projectBuildPlatform
    ? removeExistingPlatformArgs(existingArgs)
    : existingArgs;
  const baseArgs = removeExistingLabelArgs(
    removeExistingFileArgs(
      removeExistingTagArgs(argsBeforeLabelAndFileRewrite),
    ),
  );
  const labelArgs = getAutomaticDockerLabelArgs(
    workspaceRoot,
    projectRoot,
    projectName,
    authors,
  );

  return {
    ...existingOptions,
    ...(metadata ? { metadata } : {}),
    args: [
      ...(baseImageReference ? [`--tag ${baseImageReference}`] : []),
      ...baseArgs,
      `--file ${dockerfileArgument}`,
      ...labelArgs,
    ],
    cwd: buildContext,
    env: {
      ...existingEnv,
      DOCKER_BUILDKIT: existingEnv.DOCKER_BUILDKIT ?? "1",
    },
  };
};

const patchBuildTarget = (
  workspaceRoot: string,
  projectRoot: string,
  projectName: string,
  buildTargetName: string,
  dockerfilePath: string,
  buildTarget: InferredBuildTarget,
  authors: string,
  metadata: DockerBuildMetadataOptions | undefined,
  configurationMetadata: Record<string, DockerBuildMetadataOptions | undefined>,
) => {
  const configurations = buildTarget.configurations
    ? Object.fromEntries(
        Object.entries(buildTarget.configurations).map(
          ([configurationName, configurationOptions]) => [
            configurationName,
            patchBuildTargetOptions(
              workspaceRoot,
              projectRoot,
              projectName,
              buildTargetName,
              dockerfilePath,
              configurationOptions,
              authors,
              configurationMetadata[configurationName],
            ),
          ],
        ),
      )
    : undefined;

  return {
    ...buildTarget,
    options: patchBuildTargetOptions(
      workspaceRoot,
      projectRoot,
      projectName,
      buildTargetName,
      dockerfilePath,
      buildTarget.options,
      authors,
      metadata,
    ),
    ...(configurations ? { configurations } : {}),
  };
};

const patchProjects = (
  result: CreateNodesTuple[1],
  configFilePath: string,
  options: ReturnType<typeof parseOptions>,
  workspaceRoot: string,
) => {
  if (!result.projects) {
    return result;
  }

  const dockerImageAuthors =
    options.dockerImageAuthors ?? getDefaultDockerImageAuthors(workspaceRoot);
  // Capture wrapper-only metadata before stripping it from the target options passed upstream.
  const baseBuildTargetMetadata = getBuildTargetMetadata(options.buildTarget);
  const buildTargetConfigurationMetadata =
    typeof options.buildTarget === "string" || options.buildTarget === undefined
      ? {}
      : Object.fromEntries(
          Object.keys(options.buildTarget.configurations ?? {}).map(
            (configurationName) => [
              configurationName,
              getBuildTargetMetadata(options.buildTarget, configurationName),
            ],
          ),
        );

  const patchedProjects = Object.fromEntries(
    Object.entries(result.projects).map(([projectKey, projectConfig]) => {
      const projectRoot = projectConfig.root ?? path.dirname(configFilePath);
      const projectName = getProjectNameFromPath(projectRoot, workspaceRoot);
      const buildTargetName =
        typeof options.buildTarget === "string"
          ? options.buildTarget
          : (options.buildTarget?.name ?? "docker:build");
      const targets = { ...(projectConfig.targets ?? {}) };

      if (targets[buildTargetName]) {
        targets[buildTargetName] = patchBuildTarget(
          workspaceRoot,
          projectRoot,
          projectName,
          buildTargetName,
          configFilePath,
          targets[buildTargetName] as InferredBuildTarget,
          dockerImageAuthors,
          baseBuildTargetMetadata,
          buildTargetConfigurationMetadata,
        );
      }

      // Always expose a Docker-only publish target so mixed-artifact projects can compose it
      // even when nx-release-publish is already owned by a different publisher.
      targets[dockerReleasePublishTargetName] = {
        ...(targets[dockerReleasePublishTargetName] ?? {}),
        executor: "@pagopa/nx-dx-docker-plugin:release-publish",
      };

      // Ensure Docker-only projects still expose nx-release-publish.
      // Package-based projects get their final nx-release-publish target from Nx core.
      targets[nxReleasePublishTargetName] = patchNxReleasePublishTarget(
        targets[nxReleasePublishTargetName] as InferredTarget | undefined,
      );

      return [
        projectKey,
        {
          ...projectConfig,
          targets,
        },
      ];
    }),
  );

  return {
    ...result,
    projects: patchedProjects,
  };
};

export const createNodesV2 = [
  baseCreateNodesV2[0],
  async (
    configFilePaths: string[],
    rawOptions: DockerPluginOptions | undefined,
    context: Parameters<(typeof baseCreateNodesV2)[1]>[2],
  ) => {
    const options = parseOptions(rawOptions);
    const baseOptions: NxDockerPluginOptions = {
      buildTarget: normalizeTargetForNx(
        stripMetadataFromBuildTarget(options.buildTarget),
        "docker:build",
      ),
      runTarget: normalizeTargetForNx(options.runTarget, "docker:run"),
    };

    const results = (await baseCreateNodesV2[1](
      configFilePaths,
      baseOptions,
      context,
    )) as CreateNodesTuple[];

    return results.map(
      ([configFilePath, result]) =>
        [
          configFilePath,
          patchProjects(result, configFilePath, options, context.workspaceRoot),
        ] as const,
    );
  },
] as const;

// Nx mutates the loaded plugin object to attach its runtime name, so expose a plain object.
export default {
  createNodesV2,
};
