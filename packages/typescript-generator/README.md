# @pagopa/plop-generator

A PlopJS generator for creating TypeScript packages in the DX monorepo that follows established conventions and best practices.

## Features

- 🚀 **TypeScript Package Generator**: Creates new TypeScript packages with all necessary configuration
- 📦 **Turborepo Integration**: Follows monorepo structure and conventions
- 🔧 **Pre-configured Tools**: Includes ESLint, TypeScript, tsup, and other essential tools
- 📝 **Template-based**: Uses Handlebars templates for consistent package structure
- 🎯 **Workspace Aware**: Automatically detects and works within the monorepo structure

## Installation

From the workspace root:

```bash
yarn add -D @pagopa/plop-generator
```

Or install globally:

```bash
npm install -g @pagopa/plop-generator
```

## Usage

### Command Line Interface

From anywhere within the monorepo:

```bash
yarn dx-generate
```

Or if installed globally:

```bash
dx-generate
```

### Programmatic Usage

```typescript
import { Plop } from "plop";
import plopGenerator from "@pagopa/plop-generator";

const plop = new Plop();
plopGenerator(plop);
```

## Generators

### TypeScript Package

Creates a new TypeScript package with:

- **package.json** with proper dependencies and scripts
- **tsconfig.json** with TypeScript configuration
- **tsup.config.ts** for building and bundling
- **eslint.config.js** with shared ESLint rules
- **README.md** with basic documentation template
- **.gitignore** and **.node-version** files
- **src/index.ts** with a starter function (optional)

#### Prompts

1. **Package Name**: The name of the package (without @pagopa/ prefix)
2. **Description**: A brief description of the package
3. **Create src folder**: Whether to create a src folder with index.ts

#### Generated Structure

```
packages/your-package-name/
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

## Development

### Build

```bash
yarn build
```

### Development Mode

```bash
yarn dev
```

### Lint

```bash
yarn lint
```

### Format

```bash
yarn format
```

## Templates

Templates are located in the `templates/` directory and use Handlebars syntax. Each template corresponds to a file that will be generated in the new package.

### Available Variables

- `{{packageName}}`: The name of the package
- `{{description}}`: The package description
- `{{createSrcFolder}}`: Boolean indicating if src folder should be created

### Custom Helpers

- `kebabCase`: Converts text to kebab-case
- `properCase`: Converts text to proper case

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and formatting
6. Submit a pull request

## License

This project is licensed under the MIT License.
