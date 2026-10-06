import {
  CreateDependencies,
  createNodesFromFiles,
  CreateNodesV2,
} from "@nx/devkit";
import fs from "node:fs/promises";
import path from "node:path";

import { readModulePublishManifest } from "./discovery.ts";
import { getStaticDependenciesFromFile } from "./fs.ts";
import { getLocalModuleSourceRoots } from "./hcl.ts";
import { configureLogger } from "./logger.ts";
import { ModulePublishManifest } from "./manifest.ts";
import { parseOptions, TerraformPluginOptions } from "./options.ts";
import { getTerraformProjectFiles } from "./project-file.ts";
import {
  getProject,
  isTerraformLibraryRoot,
  TerraformTestCapabilities,
} from "./project.ts";

const ignoreModules = ["tests", "_tests", "examples", "example"];
const moduleManifestFileName = "module.json";
const testCapabilityByFileName: Record<
  string,
  keyof TerraformTestCapabilities
> = {
  "contract.tftest.hcl": "contract",
  "integration.tftest.hcl": "integration",
  "unit.tftest.hcl": "unit",
};
const emptyTestCapabilities = (): TerraformTestCapabilities => ({
  contract: false,
  e2e: false,
  integration: false,
  unit: false,
});

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

const toWorkspaceGlob = (root: string) =>
  `{workspaceRoot}/${root.split(path.sep).join("/")}/**/*`;

const isWorkspaceRelativeRoot = (root: string) =>
  !path.isAbsolute(root) && root !== ".." && !root.startsWith(`..${path.sep}`);

const isTraversableSharedModuleRoot = (
  root: string,
  moduleManifestRoots: ReadonlySet<string>,
) =>
  !isIgnoredRoot(root) &&
  root.split(path.sep).includes("_modules") &&
  !moduleManifestRoots.has(root);

const getSharedModuleInputsByProjectRoot = async (
  configFiles: readonly string[],
  workspaceRoot: string,
  moduleManifestRoots: ReadonlySet<string>,
) => {
  const sourceRootsByRoot = new Map<string, Set<string>>();

  for (const configFile of configFiles) {
    const root = path.dirname(configFile);
    if (isIgnoredRoot(root)) {
      continue;
    }

    if (
      path.basename(configFile) === moduleManifestFileName ||
      !configFile.endsWith(".tf")
    ) {
      continue;
    }

    const sourceRoots = sourceRootsByRoot.get(root) ?? new Set<string>();
    const fileContent = await fs.readFile(
      path.join(workspaceRoot, configFile),
      "utf-8",
    );
    for (const sourceRoot of getLocalModuleSourceRoots(
      configFile,
      fileContent,
    )) {
      if (isWorkspaceRelativeRoot(sourceRoot)) {
        sourceRoots.add(sourceRoot);
      }
    }
    sourceRootsByRoot.set(root, sourceRoots);
  }

  const sharedInputsByProjectRoot = new Map<string, string[]>();

  for (const projectRoot of sourceRootsByRoot.keys()) {
    const reachableRoots = new Set<string>([projectRoot]);

    for (const currentRoot of reachableRoots) {
      for (const sourceRoot of sourceRootsByRoot.get(currentRoot) ?? []) {
        if (
          !isTraversableSharedModuleRoot(sourceRoot, moduleManifestRoots) ||
          reachableRoots.has(sourceRoot)
        ) {
          continue;
        }

        reachableRoots.add(sourceRoot);
      }
    }

    sharedInputsByProjectRoot.set(
      projectRoot,
      Array.from(reachableRoots)
        .filter((root) => root !== projectRoot)
        .map(toWorkspaceGlob),
    );
  }

  return sharedInputsByProjectRoot;
};

export const getDiscoveryState = (configFiles: readonly string[]) => {
  const terraformConfigFiles: string[] = [];
  const moduleManifestRoots = new Set<string>();
  const testConfigFiles: string[] = [];
  const testCapabilitiesByRoot = new Map<string, TerraformTestCapabilities>();

  for (const configFile of configFiles) {
    const root = path.dirname(configFile);
    const fileName = path.basename(configFile);
    if (path.basename(root) === "tests") {
      testConfigFiles.push(configFile);
      continue;
    }
    if (isIgnoredRoot(root)) {
      continue;
    }
    if (fileName === moduleManifestFileName) {
      moduleManifestRoots.add(root);
      continue;
    }
    terraformConfigFiles.push(configFile);
  }

  const projectTerraformConfigFiles = terraformConfigFiles.filter((file) => {
    const root = path.dirname(file);
    return !isTerraformLibraryRoot(root) || moduleManifestRoots.has(root);
  });
  const terraformRoots = new Set(projectTerraformConfigFiles.map(path.dirname));
  for (const testConfigFile of testConfigFiles) {
    const testsRoot = path.dirname(testConfigFile);
    const projectRoot = path.dirname(testsRoot);
    if (!terraformRoots.has(projectRoot)) {
      continue;
    }

    const fileName = path.basename(testConfigFile);
    const capability =
      testCapabilityByFileName[fileName] ??
      (fileName.endsWith("_test.go") ? "e2e" : undefined);
    if (capability === undefined) {
      continue;
    }

    const capabilities =
      testCapabilitiesByRoot.get(projectRoot) ?? emptyTestCapabilities();
    capabilities[capability] = true;
    testCapabilitiesByRoot.set(projectRoot, capabilities);
  }

  return {
    moduleManifestRoots,
    terraformConfigFiles: projectTerraformConfigFiles,
    testCapabilitiesByRoot,
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
  const { moduleManifestRoots, terraformConfigFiles, testCapabilitiesByRoot } =
    getDiscoveryState(configFiles);
  const publishableManifestByRoot = await getPublishableManifestByRoot(
    Array.from(moduleManifestRoots),
    workspaceRoot,
  );

  return {
    moduleManifestRoots,
    publishableManifestByRoot,
    terraformConfigFiles,
    testCapabilitiesByRoot,
  };
};

export const createNodesV2: CreateNodesV2<TerraformPluginOptions> = [
  // Test files participate in graph invalidation without becoming projects.
  "**/{*.tf,module.json,tests/*.tftest.hcl,tests/*_test.go}",
  async (configFiles, options, context) => {
    await configureLogger();
    const opts = parseOptions(options);
    const hasRootTflintConfig = await fileExists(
      path.join(context.workspaceRoot, ".tflint.hcl"),
    );
    const {
      moduleManifestRoots,
      publishableManifestByRoot,
      terraformConfigFiles,
      testCapabilitiesByRoot,
    } = await getDiscoveryStateWithValidation(
      configFiles,
      context.workspaceRoot,
    );
    const sharedModuleInputsByRoot = await getSharedModuleInputsByProjectRoot(
      configFiles,
      context.workspaceRoot,
      moduleManifestRoots,
    );

    return createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);
        if (isIgnoredRoot(root)) {
          return {
            projects: {},
          };
        }
        const project = getProject(
          opts,
          context.workspaceRoot,
          root,
          hasRootTflintConfig,
          publishableManifestByRoot.get(root),
          testCapabilitiesByRoot.get(root),
          sharedModuleInputsByRoot.get(root),
        );
        return {
          projects: {
            [root]: project,
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
