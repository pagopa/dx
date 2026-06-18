/**
 * Normalizes wrapper-specific plugin options before delegating discovery to Nx.
 */
import type { DockerPluginOptions as NxDockerPluginOptions } from "@nx/docker";

export type DockerTargetOptions = Exclude<
  NxDockerPluginOptions["buildTarget"],
  string | undefined
>;

export type DockerPluginOptions = NxDockerPluginOptions & {
  dockerImageAuthors?: string;
};

export type ResolvedDockerPluginOptions = {
  buildTarget?: NxDockerPluginOptions["buildTarget"];
  dockerImageAuthors?: string;
  runTarget?: NxDockerPluginOptions["runTarget"];
};

const cloneTargetOptions = <T>(targetOptions: T): T => {
  // Nx can freeze nested target options, so clone before the wrapper patches args and cwd.
  if (typeof targetOptions === "string" || targetOptions === undefined) {
    return targetOptions;
  }

  return structuredClone(targetOptions);
};

export const parseOptions = (
  options: DockerPluginOptions | undefined,
): ResolvedDockerPluginOptions => {
  const parsedOptions: ResolvedDockerPluginOptions = {
    ...options,
  };

  if (options?.buildTarget !== undefined) {
    parsedOptions.buildTarget = cloneTargetOptions(options.buildTarget);
  }

  if (options?.dockerImageAuthors !== undefined) {
    parsedOptions.dockerImageAuthors = options.dockerImageAuthors;
  }

  if (options?.runTarget !== undefined) {
    parsedOptions.runTarget = cloneTargetOptions(options.runTarget);
  }

  return parsedOptions;
};