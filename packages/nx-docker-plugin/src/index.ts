/**
 * Wraps Nx Docker target inference with DX-specific build context, Dockerfile, and label defaults.
 */
import type { DockerPluginOptions as NxDockerPluginOptions } from "@nx/docker";
import { createNodesV2 as baseCreateNodesV2 } from "@nx/docker";
import path from "node:path";

import { getDockerBuildContext, getDockerfileArgument } from "./discovery.ts";
import {
  getAutomaticDockerLabelArgs,
  getDefaultDockerImageAuthors,
} from "./metadata.ts";
import {
  type DockerTargetOptions,
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
        targets?: Record<string, { executor?: string; options?: Record<string, unknown> }>;
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

const normalizeEnv = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
};

const normalizeTargetForNx = (
  target: string | DockerTargetOptions | undefined,
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

const removeExistingLabelArgs = (args: string[]) =>
  args.filter(
    (arg) =>
      !arg.startsWith("--label org.opencontainers.image.") &&
      arg !== "--provenance=false",
  );

const patchBuildTarget = (
  workspaceRoot: string,
  projectRoot: string,
  projectName: string,
  dockerfilePath: string,
  buildTarget: { options?: Record<string, unknown> },
  authors: string,
) => {
  const buildContext = getDockerBuildContext(workspaceRoot, projectRoot, dockerfilePath);
  const dockerfileArgument = getDockerfileArgument(buildContext, dockerfilePath);
  const existingOptions = buildTarget.options ?? {};
  const existingEnv = normalizeEnv(existingOptions.env);
  // The wrapper owns context, Dockerfile path, and OCI labels, but preserves any unrelated user args.
  const baseArgs = removeExistingLabelArgs(
    removeExistingFileArgs(normalizeArgs(existingOptions.args)),
  );
  const labelArgs = getAutomaticDockerLabelArgs(
    workspaceRoot,
    projectRoot,
    projectName,
    authors,
  );

  return {
    ...buildTarget,
    options: {
      ...existingOptions,
      cwd: buildContext,
      env: {
        ...existingEnv,
        DOCKER_BUILDKIT: existingEnv.DOCKER_BUILDKIT ?? "1",
      },
      args: [...baseArgs, `--file ${dockerfileArgument}`, ...labelArgs],
    },
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

  const patchedProjects = Object.fromEntries(
    Object.entries(result.projects).map(([projectKey, projectConfig]) => {
      const projectRoot = projectConfig.root ?? path.dirname(configFilePath);
      const projectName = getProjectNameFromPath(projectRoot, workspaceRoot);
      const buildTargetName =
        typeof options.buildTarget === "string"
          ? options.buildTarget
          : options.buildTarget?.name ?? "docker:build";
      const targets = { ...(projectConfig.targets ?? {}) };

      if (targets[buildTargetName]) {
        targets[buildTargetName] = patchBuildTarget(
          workspaceRoot,
          projectRoot,
          projectName,
          configFilePath,
          targets[buildTargetName],
          dockerImageAuthors,
        );
      }

      // Nx infers the target name, but publishing must go through the custom executor.
      targets["nx-release-publish"] = {
        ...(targets["nx-release-publish"] ?? {}),
        executor: "@pagopa/nx-docker-plugin:release-publish",
      };

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
    context: Parameters<typeof baseCreateNodesV2[1]>[2],
  ) => {
    const options = parseOptions(rawOptions);
    const baseOptions: NxDockerPluginOptions = {
      buildTarget: normalizeTargetForNx(options.buildTarget, "docker:build"),
      runTarget: normalizeTargetForNx(options.runTarget, "docker:run"),
    };

    const results = (await baseCreateNodesV2[1](
      configFilePaths,
      baseOptions,
      context,
    )) as CreateNodesTuple[];

    return results.map(([configFilePath, result]) => [
      configFilePath,
      patchProjects(result, configFilePath, options, context.workspaceRoot),
    ] as const);
  },
] as const;

// Nx mutates the loaded plugin object to attach its runtime name, so expose a plain object.
export default {
  createNodesV2,
};