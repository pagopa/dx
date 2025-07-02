# @pagopa/typescript-library-generator

A PlopJS generator for creating TypeScript libraries in the DX monorepo that follows established conventions and best practices and uses tsup for building.

## Features

- 🚀 **TypeScript Library Generator**: Creates new TypeScript libraries with all necessary configuration
- 📦 **Turborepo Integration**: Follows monorepo structure and conventions
- 🔧 **Pre-configured Tools**: Includes ESLint, TypeScript, and other essential tools
- 📝 **Template-based**: Uses Handlebars templates for consistent library structure
- 🎯 **Workspace Aware**: Automatically detects and works within the monorepo structure

## Installation

From non-DX repositories:

```bash
yarn add -D @pagopa/typescript-library-generator
```

## Usage

When using in the DX monorepo, you can run the generator directly from the root directory:

```bash
yarn run turbo gen typescript-library-generator
```

## Generators

### TypeScript Library

Creates a new TypeScript library with:

- **package.json** with proper dependencies and scripts
- **tsconfig.json** with TypeScript configuration
- **eslint.config.js** with shared ESLint rules
- **README.md** with basic documentation template
- **.gitignore** and **.node-version** files
- **src/index.ts** with a starter function (optional)

#### Prompts

1. **Library Name**: The name of the library (including prefix)
2. **Description**: A brief description of the library
3. **Create src folder**: Whether to create a src folder with index.ts

#### Generated Structure

```
packages/your-library-name/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── eslint.config.js
├── README.md
├── .gitignore
├── .node-version
└── src/
    └── index.ts
```

## Templates

Templates are located in the `templates/` directory and use Handlebars syntax. Each template corresponds to a file that will be generated in the new library.

### Available Variables

- `{{packageName}}`: The name of the library
- `{{description}}`: The library description
- `{{createSrcFolder}}`: Boolean indicating if src folder should be created

### Custom Helpers

- `kebabCase`: Converts text to kebab-case
- `properCase`: Converts text to proper case
