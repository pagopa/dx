/**
 * PlopJS Generator for TypeScript packages in the DX monorepo
 *
 * This module provides generators for creating new TypeScript packages
 * that follow the DX monorepo conventions and best practices.
 */

import type { NodePlopAPI } from "plop";

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the git repository URL from the current git remote
 */
function getGitRepositoryUrl(): string {
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

interface Params {
  createChangeset: boolean;
  createSrcFolder: boolean;
  createTests: boolean;
  description: string;
  packageName: string;
  repositoryUrl: string;
}

export default function (plop: NodePlopAPI) {
  // Set the base path for templates
  plop.setGenerator("typescript-package", {
    actions: [
      {
        path: "packages/{{packageName}}/package.json",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/package.json.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/tsconfig.json",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/tsconfig.json.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/tsup.config.ts",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/tsup.config.ts.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/eslint.config.js",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/eslint.config.js.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/README.md",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/README.md.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/.gitignore",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/.gitignore.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/.node-version",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/.node-version.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/src/index.ts",
        skip: (data: Params) => {
          if (!data.createSrcFolder) {
            return "Skipping src folder creation";
          }
          return false;
        },
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/src/index.ts.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/test/index.test.ts",
        skip: (data: Params) => {
          if (!data.createTests) {
            return "Skipping test folder creation";
          }
          return false;
        },
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/test/index.test.ts.hbs",
        ),
        type: "add",
      },
      {
        path: "packages/{{packageName}}/vitest.config.ts",
        skip: (data: Params) => {
          if (!data.createTests) {
            return "Skipping vitest config creation";
          }
          return false;
        },
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/vitest.config.ts.hbs",
        ),
        type: "add",
      },
      {
        path: ".changeset/{{packageName}}-initial.md",
        skip: (data: Params) => {
          if (!data.createChangeset) {
            return "Skipping changeset creation";
          }
          return false;
        },
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/.changeset/initial.md.hbs",
        ),
        type: "add",
      },
      // Post-generation: install dependencies
      installDependencies,
    ],
    description: "Create a new TypeScript package for the DX monorepo",
    prompts: [
      {
        message: "What is the package name?",
        name: "packageName",
        type: "input",
        validate: (input: string) => {
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
    ],
  });

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
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
    ),
  );

  // Helper to get the current git repository URL
  plop.setHelper("getGitRepositoryUrl", () => getGitRepositoryUrl());
}

/**
 * Install dependencies for a new TypeScript package
 */
function installDependencies(answers: Record<string, unknown>): string {
  const packagePath = path.join(
    process.cwd(),
    "packages",
    answers.packageName as string,
  );
  try {
    execSync(
      "yarn add -D @pagopa/eslint-config @tsconfig/node20 @types/node eslint@^8.0.0 tsup typescript vitest",
      { cwd: packagePath, stdio: "inherit" },
    );
    execSync("yarn add -DE prettier", {
      cwd: packagePath,
      stdio: "inherit",
    });
    return "Dependencies installed successfully.";
  } catch (e) {
    return `Dependency installation failed: ${e}`;
  }
}
