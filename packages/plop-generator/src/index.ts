/**
 * PlopJS Generator for TypeScript packages in the DX monorepo
 *
 * This module provides generators for creating new TypeScript packages
 * that follow the DX monorepo conventions and best practices.
 */

import type { NodePlopAPI } from "plop";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (plop: NodePlopAPI) {
  // Set the base path for templates
  plop.setGenerator("typescript-package", {
    description: "Create a new TypeScript package for the DX monorepo",
    prompts: [
      {
        type: "input",
        name: "packageName",
        message: "What is the package name? (without @pagopa/ prefix)",
        validate: (input: string) => {
          if (!input) {
            return "Package name is required";
          }
          if (input.includes(" ")) {
            return "Package name cannot contain spaces";
          }
          if (input.startsWith("@")) {
            return "Do not include the @pagopa/ prefix";
          }
          if (!/^[a-z0-9-]+$/.test(input)) {
            return "Package name must only contain lowercase letters, numbers, and hyphens";
          }
          return true;
        },
      },
      {
        type: "input",
        name: "description",
        message: "Package description:",
        validate: (input: string) => {
          if (!input) {
            return "Description is required";
          }
          return true;
        },
      },
      {
        type: "confirm",
        name: "createSrcFolder",
        message: "Create src folder with index.ts?",
        default: true,
      },
      {
        type: "confirm",
        name: "createTests",
        message: "Create test folder with basic tests?",
        default: true,
      },
      {
        type: "confirm",
        name: "createChangeset",
        message: "Create initial changeset?",
        default: true,
      },
    ],
    actions: [
      {
        type: "add",
        path: "packages/{{packageName}}/package.json",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/package.json.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/tsconfig.json",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/tsconfig.json.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/tsup.config.ts",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/tsup.config.ts.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/eslint.config.js",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/eslint.config.js.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/README.md",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/README.md.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/.gitignore",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/.gitignore.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/.node-version",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/.node-version.hbs",
        ),
      },
      {
        type: "add",
        path: "packages/{{packageName}}/src/index.ts",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/src/index.ts.hbs",
        ),
        skip: (data: any) => {
          if (!data.createSrcFolder) {
            return "Skipping src folder creation";
          }
          return false;
        },
      },
      {
        type: "add",
        path: "packages/{{packageName}}/test/index.test.ts",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/test/index.test.ts.hbs",
        ),
        skip: (data: any) => {
          if (!data.createTests) {
            return "Skipping test folder creation";
          }
          return false;
        },
      },
      {
        type: "add",
        path: "packages/{{packageName}}/vitest.config.ts",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/vitest.config.ts.hbs",
        ),
        skip: (data: any) => {
          if (!data.createTests) {
            return "Skipping vitest config creation";
          }
          return false;
        },
      },
      {
        type: "add",
        path: ".changeset/{{packageName}}-initial.md",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/.changeset/initial.md.hbs",
        ),
        skip: (data: any) => {
          if (!data.createChangeset) {
            return "Skipping changeset creation";
          }
          return false;
        },
      },
    ],
  });

  // Helper for package names
  plop.setHelper("kebabCase", (text: string) => {
    return text
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase();
  });

  // Helper for proper case
  plop.setHelper("properCase", (text: string) => {
    return text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  });
}
