/**
 * Core functionality for TypeScript package generators in the DX monorepo
 *
 * This module provides shared functionality for creating new TypeScript packages
 * that follow the DX monorepo conventions and best practices.
 */

import type { ActionType, NodePlopAPI } from "plop";

import { execSync } from "node:child_process";
import path from "node:path";

/**
 * Get the git repository URL from the current git remote
 */
export function getGitRepositoryUrl(): string {
  try {
    // Get the remote origin URL
    const remoteUrl = execSync("git config --get remote.origin.url", {
      encoding: "utf8",
    }).trim();

    // Convert SSH URLs to HTTPS format for package.json
    if (remoteUrl.startsWith("git@github.com:")) {
      return remoteUrl
        .replace("git@github.com:", "https://github.com/")
        .replace(/\.git$/, "");
    }

    // Remove .git suffix if present
    return remoteUrl.replace(/\.git$/, "");
  } catch {
    // Throw an error if git command fails
    throw new Error("Failed to get git repository URL");
  }
}

export interface GeneratorParams {
  createChangeset: boolean;
  createSrcFolder: boolean;
  createTests: boolean;
  description: string;
  packageName: string;
  repositoryUrl: string;
}

export interface GeneratorConfig {
  /** Additional actions to perform during generation */
  additionalActions?: ActionType[];
  /** Additional dependencies to install beyond the base ones */
  additionalDependencies?: string[];
  /** The description of the generator */
  description: string;
  /** The name of the generator */
  name: string;
  /** Custom validation for package name (optional) */
  packageNameValidation?: (input: string) => boolean | string;
  /** Override specific template paths */
  templateOverrides?: {
    changeset?: string;
    eslintConfig?: string;
    gitignore?: string;
    nodeVersion?: string;
    packageJson?: string;
    readme?: string;
    srcIndex?: string;
    testIndex?: string;
    tsconfig?: string;
    vitestConfig?: string;
  };
  /** Path to the templates directory */
  templatesPath: string;
}

/**
 * Create the base actions that all generators share
 */
function createBaseActions(
  templatesPath: string,
  overrides: GeneratorConfig["templateOverrides"] = {},
): ActionType[] {
  return [
    {
      path: "packages/{{packageName}}/package.json",
      templateFile:
        overrides?.packageJson || path.join(templatesPath, "package.json.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/tsconfig.json",
      templateFile:
        overrides?.tsconfig || path.join(templatesPath, "tsconfig.json.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/eslint.config.js",
      templateFile:
        overrides?.eslintConfig ||
        path.join(templatesPath, "eslint.config.js.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/README.md",
      templateFile:
        overrides?.readme || path.join(templatesPath, "README.md.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/.gitignore",
      templateFile:
        overrides?.gitignore || path.join(templatesPath, ".gitignore.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/.node-version",
      templateFile:
        overrides?.nodeVersion || path.join(templatesPath, ".node-version.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/src/index.ts",
      skip: (data: GeneratorParams) => {
        if (!data.createSrcFolder) {
          return "Skipping src folder creation";
        }
        return false;
      },
      templateFile:
        overrides?.srcIndex || path.join(templatesPath, "src/index.ts.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/test/index.test.ts",
      skip: (data: GeneratorParams) => {
        if (!data.createTests) {
          return "Skipping test folder creation";
        }
        return false;
      },
      templateFile:
        overrides?.testIndex ||
        path.join(templatesPath, "test/index.test.ts.hbs"),
      type: "add",
    },
    {
      path: "packages/{{packageName}}/vitest.config.ts",
      skip: (data: GeneratorParams) => {
        if (!data.createTests) {
          return "Skipping vitest config creation";
        }
        return false;
      },
      templateFile:
        overrides?.vitestConfig ||
        path.join(templatesPath, "vitest.config.ts.hbs"),
      type: "add",
    },
    {
      path: ".changeset/{{packageName}}-initial.md",
      skip: (data: GeneratorParams) => {
        if (!data.createChangeset) {
          return "Skipping changeset creation";
        }
        return false;
      },
      templateFile:
        overrides?.changeset ||
        path.join(templatesPath, ".changeset/initial.md.hbs"),
      type: "add",
    },
  ];
}

/**
 * Create the base prompts that all generators share
 */
function createBasePrompts() {
  return [
    {
      message: "What is the package name?",
      name: "packageName",
      type: "input",
      validate: (input: string): boolean | string => {
        if (!input) {
          return "Package name is required";
        }
        if (input.includes(" ")) {
          return "Package name cannot contain spaces";
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return "Package name must only contain lowercase letters, numbers, and hyphens";
        }
        return true;
      },
    },
    {
      message: "Package description:",
      name: "description",
      type: "input",
      validate: (input: string) => {
        if (!input) {
          return "Description is required";
        }
        return true;
      },
    },
    {
      default: true,
      message: "Create src folder with index.ts?",
      name: "createSrcFolder",
      type: "confirm",
    },
    {
      default: true,
      message: "Create test folder with basic tests?",
      name: "createTests",
      type: "confirm",
    },
    {
      default: true,
      message: "Create initial changeset?",
      name: "createChangeset",
      type: "confirm",
    },
  ];
}

/**
 * Install dependencies for a new TypeScript package
 */
export function createInstallDependenciesAction(
  additionalDependencies: string[] = [],
) {
  return function installDependencies(
    answers: Record<string, unknown>,
  ): string {
    const packagePath = path.join(
      process.cwd(),
      "packages",
      answers.packageName as string,
    );

    const baseDependencies = [
      "@pagopa/eslint-config",
      "@tsconfig/node20",
      "@types/node",
      "eslint@^8.0.0",
      "prettier",
      "typescript",
      "vitest",
    ];

    const allDependencies = [...baseDependencies, ...additionalDependencies];

    try {
      // Sanitize dependency names to prevent shell injection
      const sanitizedDependencies = allDependencies.map((dep) =>
        dep.replace(/[^a-zA-Z0-9@/._-]/g, ""),
      );

      execSync(`pnpm add -D ${sanitizedDependencies.join(" ")}`, {
        cwd: packagePath,
        stdio: "inherit",
      });
      return "Dependencies installed successfully.";
    } catch (e) {
      return `Dependency installation failed: ${e}`;
    }
  };
}

/**
 * Setup common helpers for all generators
 */
export function setupCommonHelpers(plop: NodePlopAPI) {
  // Helper for package names
  plop.setHelper("kebabCase", (text: string) =>
    text
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase(),
  );

  // Helper for proper case
  plop.setHelper("properCase", (text: string) =>
    text.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
    ),
  );

  // Helper to get the current git repository URL
  plop.setHelper("getGitRepositoryUrl", () => getGitRepositoryUrl());
}

/**
 * Create a TypeScript package generator with the given configuration
 */
export function createTypeScriptGenerator(
  plop: NodePlopAPI,
  config: GeneratorConfig,
) {
  setupCommonHelpers(plop);

  const baseActions = createBaseActions(
    config.templatesPath,
    config.templateOverrides,
  );
  const installDependenciesAction = createInstallDependenciesAction(
    config.additionalDependencies,
  );

  const actions = [
    ...baseActions,
    ...(config.additionalActions || []),
    installDependenciesAction,
  ];

  const basePrompts = createBasePrompts();

  // Override package name validation if provided
  if (config.packageNameValidation) {
    const packageNamePrompt = basePrompts.find((p) => p.name === "packageName");
    if (packageNamePrompt) {
      packageNamePrompt.validate = config.packageNameValidation;
    }
  }

  plop.setGenerator(config.name, {
    actions,
    description: config.description,
    prompts: basePrompts,
  });
}
