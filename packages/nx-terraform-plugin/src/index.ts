import {
  CreateDependencies,
  createNodesFromFiles,
  CreateNodesV2,
} from "@nx/devkit";
import fs from "node:fs/promises";
import path from "node:path";

import {
  readEnvironmentManifest,
  readModulePublishManifest,
} from "./discovery.ts";
import { getStaticDependenciesFromFile } from "./fs.ts";
import { configureLogger } from "./logger.ts";
import { EnvironmentManifest, ModulePublishManifest } from "./manifest.ts";
import { parseOptions, TerraformPluginOptions } from "./options.ts";
import { getTerraformProjectFiles } from "./project-file.ts";
import { getProject } from "./project.ts";

const ignoreModules = ["tests", "_tests", "examples", "example"];
const moduleManifestFileName = "module.json";
const environmentManifestFileName = "environment.json";

const isIgnoredRoot = (root: string) => {
  const rootSegments = new Set(root.split(path.sep));
  return ignoreModules.some((module) => rootSegments.has(module));
};

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

export const getDiscoveryState = (configFiles: readonly string[]) => {
  const terraformConfigFiles: string[] = [];
  const moduleManifestRoots = new Set<string>();
  const environmentManifestRoots = new Set<string>();

  for (const configFile of configFiles) {
    const root = path.dirname(configFile);
    if (isIgnoredRoot(root)) {
      continue;
    }
    const fileName = path.basename(configFile);
    if (fileName === moduleManifestFileName) {
      moduleManifestRoots.add(root);
      continue;
    }
    if (fileName === environmentManifestFileName) {
      environmentManifestRoots.add(root);
      continue;
    }
    terraformConfigFiles.push(configFile);
  }

  return {
    environmentManifestRoots,
    moduleManifestRoots,
    terraformConfigFiles,
  };
};

export const getPublishableManifestByRoot = async (
  moduleManifestRoots: readonly string[],
  workspaceRoot: string,
): Promise<Map<string, ModulePublishManifest>> => {
  const validationResults = await Promise.all(
    moduleManifestRoots.map(async (root) => {
      const absoluteRoot = path.join(workspaceRoot, root);
      const manifest = await readModulePublishManifest(absoluteRoot);
      return manifest ? [root, manifest] : null;
    }),
  );

  return new Map(
    validationResults.filter(
      (rootManifest): rootManifest is [string, ModulePublishManifest] =>
        rootManifest !== null,
    ),
  );
};

export const getEnvironmentManifestByRoot = async (
  environmentManifestRoots: readonly string[],
  workspaceRoot: string,
): Promise<Map<string, EnvironmentManifest>> => {
  const validationResults = await Promise.all(
    environmentManifestRoots.map(async (root) => {
      const absoluteRoot = path.join(workspaceRoot, root);
      const manifest = await readEnvironmentManifest(absoluteRoot);
      return manifest ? [root, manifest] : null;
    }),
  );

  return new Map(
    validationResults.filter(
      (rootManifest): rootManifest is [string, EnvironmentManifest] =>
        rootManifest !== null,
    ),
  );
};

export const getDiscoveryStateWithValidation = async (
  configFiles: readonly string[],
  workspaceRoot: string,
) => {
  const {
    environmentManifestRoots,
    moduleManifestRoots,
    terraformConfigFiles,
  } = getDiscoveryState(configFiles);
  const publishableManifestByRoot = await getPublishableManifestByRoot(
    Array.from(moduleManifestRoots),
    workspaceRoot,
  );
  const environmentManifestByRoot = await getEnvironmentManifestByRoot(
    Array.from(environmentManifestRoots),
    workspaceRoot,
  );

  return {
    environmentManifestByRoot,
    publishableManifestByRoot,
    terraformConfigFiles,
  };
};

export const createNodesV2: CreateNodesV2<TerraformPluginOptions> = [
  // We discover Terraform files, module manifests, and environment manifests in one pass.
  "**/{*.tf,module.json,environment.json}",
  async (configFiles, options, context) => {
    await configureLogger();
    const opts = parseOptions(options);
    const hasRootTflintConfig = await fileExists(
      path.join(context.workspaceRoot, ".tflint.hcl"),
    );
    const {
      environmentManifestByRoot,
      publishableManifestByRoot,
      terraformConfigFiles,
    } = await getDiscoveryStateWithValidation(
      configFiles,
      context.workspaceRoot,
    );

    return createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);
        if (isIgnoredRoot(root)) {
          return {
            projects: {},
          };
        }
        return {
          projects: {
            [root]: getProject(
              opts,
              root,
              hasRootTflintConfig,
              publishableManifestByRoot.get(root),
              environmentManifestByRoot.get(root),
            ),
          },
        };
      },
      terraformConfigFiles,
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
