/**
 * PlopJS Generator for TypeScript packages in the DX monorepo
 *
 * This module provides generators for creating new TypeScript packages
 * that follow the DX monorepo conventions and best practices.
 */

import type { NodePlopAPI } from "plop";

import { createTypeScriptGenerator } from "@pagopa/typescript-core-generator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (plop: NodePlopAPI) {
  createTypeScriptGenerator(plop, {
    additionalDependencies: [],
    description: "Create a new TypeScript package for the DX monorepo",
    name: "typescript-package",
    templatesPath: path.join(
      __dirname,
      "../../typescript-core-generator/templates/typescript-package",
    ),
    // Uses core templates with no additional dependencies or overrides
  });
}
