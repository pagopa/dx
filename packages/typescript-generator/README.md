# @pagopa/typescript-generator

Core functionality for TypeScript package generators in the DX monorepo.

## Overview

This package provides shared functionality for creating new TypeScript packages that follow the DX monorepo conventions and best practices. It eliminates code duplication between different generator packages by providing a common foundation.

## Features

- **Shared Generator Logic**: Common functionality for all TypeScript package generators
- **Configurable Actions**: Base actions that can be extended with additional specific actions
- **Dependency Management**: Flexible dependency installation with support for additional packages
- **Git Integration**: Automatic git repository URL detection
- **Template Management**: Support for custom template paths
- **Helper Functions**: Common PlopJS helpers (kebabCase, properCase, getGitRepositoryUrl)

## Usage

```typescript
import { createTypeScriptGenerator } from "@pagopa/typescript-generator";
import type { NodePlopAPI } from "plop";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function (plop: NodePlopAPI) {
  createTypeScriptGenerator(plop, {
    name: "my-typescript-package",
    description: "Create a new TypeScript package",
    templatesPath: path.join(__dirname, "../templates/typescript-package"),
    additionalDependencies: ["tsup"], // Optional: additional npm packages to install
    additionalActions: [
      // Optional: additional file generation actions
      {
        path: "packages/{{packageName}}/custom.config.ts",
        templateFile: path.join(__dirname, "../templates/custom.config.ts.hbs"),
        type: "add",
      },
    ],
  });
}
```

## Configuration Options

### `GeneratorConfig`

- `name` (string): The name of the generator
- `description` (string): The description of the generator
- `templatesPath` (string): Path to the templates directory
- `additionalDependencies` (string[], optional): Additional dependencies to install beyond the base ones
- `additionalActions` (ActionType[], optional): Additional actions to perform during generation
- `packageNameValidation` (function, optional): Custom validation for package name

## Base Actions

The core package provides these base actions for all generators:

- `package.json` generation
- `tsconfig.json` generation
- `eslint.config.js` generation
- `README.md` generation
- `.gitignore` generation
- `.node-version` generation
- `src/index.ts` generation (conditional)
- `test/index.test.ts` generation (conditional)
- `vitest.config.ts` generation (conditional)
- `.changeset/initial.md` generation (conditional)

## Base Dependencies

All generators automatically install these base dependencies:

- `@pagopa/eslint-config`
- `@tsconfig/node20`
- `@types/node`
- `eslint@^8.0.0`
- `typescript`
- `vitest`
- `prettier`

## Extending the Core

To create a new generator that extends the core functionality:

1. Create a new package that depends on `@pagopa/typescript-generator`
2. Create your templates directory
3. Use `createTypeScriptGenerator` with your specific configuration
4. Add any additional actions or dependencies as needed

## Example: Library Generator

```typescript
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
    templatesPath: path.join(__dirname, "../templates/typescript-package"),
  });
}
```

This creates a library-specific generator that adds `tsup` configuration and dependency while reusing all the base functionality from the core.
