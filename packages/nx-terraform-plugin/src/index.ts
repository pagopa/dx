import {
  CreateDependencies,
  createNodesFromFiles,
  CreateNodesV2,
} from "@nx/devkit";
import path from "node:path";

import { getStaticDependenciesFromFile } from "./fs.ts";
import { getProjectNameFromRoot, getTerraformProjectFiles } from "./project.ts";

export const createNodesV2: CreateNodesV2<unknown> = [
  // We create a terraform project for each directory containing .tf files
  "**/*.tf",
  async (configFiles, options, context) =>
    await createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);
        const name = getProjectNameFromRoot(root);
        return {
          projects: {
            [root]: {
              name,
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
