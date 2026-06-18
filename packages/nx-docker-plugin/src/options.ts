/**
 * Normalizes wrapper-specific plugin options before delegating discovery to Nx.
 */
import type { DockerPluginOptions as NxDockerPluginOptions } from "@nx/docker";

export interface DockerPluginOptions extends NxDockerPluginOptions {
  dockerImageAuthors?: string;
}

export interface ResolvedDockerPluginOptions extends NxDockerPluginOptions {
  dockerImageAuthors: string;
}

const cloneTargetOptions = <T>(targetOptions: T): T => {
  if (typeof targetOptions === "string" || targetOptions === undefined) {
    return targetOptions;
  }

  return structuredClone(targetOptions);
};

export const parseOptions = (
  options: DockerPluginOptions | undefined,
): ResolvedDockerPluginOptions => ({
  ...options,
  buildTarget: cloneTargetOptions(options?.buildTarget),
  dockerImageAuthors: options?.dockerImageAuthors ?? "PagoPA",
  runTarget: cloneTargetOptions(options?.runTarget),
});