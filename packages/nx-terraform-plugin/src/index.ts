import {
  CreateDependencies,
  createNodesFromFiles,
  CreateNodesV2,
} from "@nx/devkit";
import fs from "node:fs/promises";
import path from "node:path";

import { getStaticDependenciesFromFile } from "./fs.ts";
import { parseOptions, TerraformPluginOptions } from "./options.ts";
import { getTerraformProjectFiles } from "./project-file.ts";
import { getProject } from "./project.ts";

const ignoreModules = ["tests", "_tests", "examples", "example"];

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
};

export const createNodesV2: CreateNodesV2<TerraformPluginOptions> = [
  // We create a terraform project for each directory containing .tf files
  "**/*.tf",
  async (configFiles, options, context) => {
    const opts = parseOptions(options);
    const hasRootTflintConfig = await fileExists(
      path.join(context.workspaceRoot, ".tflint.hcl"),
    );
    return createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);
        const rootSegments = new Set(root.split(path.sep));
        if (ignoreModules.some((module) => rootSegments.has(module))) {
          return {
            projects: {},
          };
        }
        return {
          projects: {
            [root]: getProject(opts, root, hasRootTflintConfig),
          },
        };
      },
      configFiles,
      options,
      context,
    );
  },
];

export const createDependencies: CreateDependencies<
  TerraformPluginOptions
> = async (opts, ctx) => {
  const filesToProcess = getTerraformProjectFiles(
    // Get from Nx only changed Terraform files, then derive static project-graph
    // dependencies from Terraform module source references in those files.
    ctx.filesToProcess.projectFileMap,
  );
  const dependencies = await Promise.all(
    filesToProcess.map(getStaticDependenciesFromFile),
  );
  return dependencies.flat();
};
