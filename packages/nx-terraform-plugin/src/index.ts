import {
  CreateDependencies,
  createNodesFromFiles,
  CreateNodesV2,
} from "@nx/devkit";
import fs from "node:fs/promises";
import path from "node:path";

import { readModulePublishManifest } from "./discovery.ts";
import { getStaticDependenciesFromFile } from "./fs.ts";
import { configureLogger } from "./logger.ts";
import { ModulePublishManifest } from "./manifest.ts";
import { parseOptions, TerraformPluginOptions } from "./options.ts";
import { getTerraformProjectFiles } from "./project-file.ts";
import { getProject, TerraformTestCapabilities } from "./project.ts";

const ignoreModules = ["tests", "_tests", "examples", "example"];
const moduleManifestFileName = "module.json";
const testDirectoryName = "tests";

export const getTestCapabilitiesByRoot = (
  configFiles: readonly string[],
): Map<string, TerraformTestCapabilities> =>
  configFiles.reduce((capabilitiesByRoot, configFile) => {
    const fileName = path.basename(configFile);
    const testDirectory = path.dirname(configFile);
    if (path.basename(testDirectory) !== testDirectoryName) {
      return capabilitiesByRoot;
    }

    const root = path.dirname(testDirectory);
    const capabilities = capabilitiesByRoot.get(root) ?? {
      hasContractTests: false,
      hasE2eTests: false,
      hasIntegrationTests: false,
      hasTests: false,
      hasUnitTests: false,
    };

    if (fileName === "unit.tftest.hcl") {
      capabilities.hasUnitTests = true;
    } else if (fileName === "contract.tftest.hcl") {
      capabilities.hasContractTests = true;
    } else if (fileName === "integration.tftest.hcl") {
      capabilities.hasIntegrationTests = true;
    } else if (fileName.endsWith(".go")) {
      capabilities.hasE2eTests = true;
    } else {
      return capabilitiesByRoot;
    }

    capabilities.hasTests = true;
    return new Map(capabilitiesByRoot).set(root, capabilities);
  }, new Map<string, TerraformTestCapabilities>());

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
    if (fileName.endsWith(".tf")) {
      terraformConfigFiles.push(configFile);
    }
  }

  return {
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

export const getDiscoveryStateWithValidation = async (
  configFiles: readonly string[],
  workspaceRoot: string,
) => {
  const { moduleManifestRoots, terraformConfigFiles } =
    getDiscoveryState(configFiles);
  const publishableManifestByRoot = await getPublishableManifestByRoot(
    Array.from(moduleManifestRoots),
    workspaceRoot,
  );

  return {
    publishableManifestByRoot,
    terraformConfigFiles,
  };
};

export const createNodesV2: CreateNodesV2<TerraformPluginOptions> = [
  // We discover both Terraform modules and module manifests in one pass.
  "**/{*.tf,module.json,tests/*.tftest.hcl,tests/*.go}",
  async (configFiles, options, context) => {
    await configureLogger();
    const opts = parseOptions(options);
    const hasRootTflintConfig = await fileExists(
      path.join(context.workspaceRoot, ".tflint.hcl"),
    );
    const { publishableManifestByRoot, terraformConfigFiles } =
      await getDiscoveryStateWithValidation(configFiles, context.workspaceRoot);
    const testCapabilitiesByRoot = getTestCapabilitiesByRoot(configFiles);

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
              testCapabilitiesByRoot.get(root) ?? {
                hasContractTests: false,
                hasE2eTests: false,
                hasIntegrationTests: false,
                hasTests: false,
                hasUnitTests: false,
              },
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
