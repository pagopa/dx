/**
 * PlopJS Generator for TypeScript library packages in the DX monorepo
 *
 * This module provides generators for creating new TypeScript library packages
 * that follow the DX monorepo conventions and best practices.
 */

import type { NodePlopAPI } from "plop";

import { createTypeScriptGenerator } from "@pagopa/typescript-generator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (plop: NodePlopAPI) {
  createTypeScriptGenerator(plop, {
    additionalActions: [
      {
        path: "packages/{{packageName}}/tsup.config.ts",
        templateFile: path.join(
          __dirname,
          "../templates/typescript-package/tsup.config.ts.hbs",
        ),
        type: "add",
      },
    ],
    additionalDependencies: ["tsup"],
    description: "Create a new TypeScript library package for the DX monorepo",
    name: "typescript-library-package",
    templateOverrides: {
      packageJson: path.join(
        __dirname,
        "../templates/typescript-package/package.json.hbs",
      ),
    },
    templatesPath: path.join(
      __dirname,
      "../../typescript-generator/templates/typescript-package",
    ),
  });
}
