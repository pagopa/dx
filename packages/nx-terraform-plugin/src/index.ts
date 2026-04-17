import {
  CreateDependencies,
  createNodesFromFiles,
  CreateNodesV2,
  ProjectType,
} from "@nx/devkit";
import path from "node:path";

import { getStaticDependenciesFromFile } from "./fs.ts";
import { getProjectNameFromRoot, getTerraformProjectFiles } from "./project.ts";

const ignoreModules = ["tests", "_tests", "examples", "example"];

export const createNodesV2: CreateNodesV2<unknown> = [
  // We create a terraform project for each directory containing .tf files
  "**/*.tf",
  async (configFiles, options, context) =>
    await createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);

        const rootSegments = new Set(root.split(path.sep));

        if (ignoreModules.some((module) => rootSegments.has(module))) {
          return {
            projects: {},
          };
        }

        const name = getProjectNameFromRoot(root);

        const projectType: ProjectType =
          rootSegments.has("modules") || rootSegments.has("_modules")
            ? "library"
            : "application";

        return {
          projects: {
            [root]: {
              name,
              projectType,
              // We assign the 'terraform' tag to all projects created from Terraform configuration files
              // So that they can be easily targeted in Nx commands with --projects=tag:terraform
              tags: ["terraform"],
            },
          },
        };
      },
      configFiles,
      options,
      context,
    ),
];

export const createDependencies: CreateDependencies<unknown> = async (
  opts,
  ctx,
) => {
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
