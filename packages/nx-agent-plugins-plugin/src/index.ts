/** Infers Nx projects from agent plugin manifests and configures their release versioning. */
import {
  createNodesFromFiles,
  type CreateNodesV2,
  type ProjectConfiguration,
} from "@nx/devkit";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ZodError } from "zod/v4";

import { parseAgentPluginManifest } from "./manifest.ts";

const getAgentPluginProject = async (
  configFilePath: string,
  workspaceRoot: string,
): Promise<null | ProjectConfiguration> => {
  const manifestContent = await readFile(
    resolve(workspaceRoot, configFilePath),
    "utf-8",
  );
  try {
    const manifest = parseAgentPluginManifest(manifestContent);
    return {
      name: manifest.name,
      projectType: "library",
      release: {
        version: {
          currentVersionResolver: "disk",
          manifestRootsToUpdate: ["{projectRoot}"],
          versionActions: "@pagopa/nx-agent-plugins/release/version-actions",
        },
      },
      root: dirname(configFilePath),
      tags: ["agent-plugins"],
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return null;
    }
    throw error;
  }
};

export const createNodesV2: CreateNodesV2<Record<string, unknown>> = [
  "**/plugin.json",
  async (configFilePaths, options, context) =>
    createNodesFromFiles(
      async (configFilePath) => {
        const project = await getAgentPluginProject(
          configFilePath,
          context.workspaceRoot,
        );
        return project
          ? { projects: { [dirname(configFilePath)]: project } }
          : { projects: {} };
      },
      configFilePaths,
      options,
      context,
    ),
];
