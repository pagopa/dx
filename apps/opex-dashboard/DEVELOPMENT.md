# Development Guide - opex-dashboard

This document provides a technical overview of the `opex-dashboard` architecture, execution flow, and guidelines for developers looking to extend or maintain the project.

## Architecture Overview

`opex-dashboard` is a TypeScript-based tool designed to automate the creation of Azure Operational Dashboards from OpenAPI 3 specifications. It follows a modular architecture with a clear separation between configuration loading, specification resolution, and dashboard building.

### Core Concepts

- **Resolver**: Handles fetching and dereferencing OpenAPI specifications (resolving `$ref`).
- **Builder**: Orchestrates the data extraction and template rendering.
- **Template**: Logic-less or low-logic functions that generate the final output (JSON or Terraform).
- **Resource Type**: Defines which Azure resource is being monitored (e.g., `app-gateway`, `api-management`).

## Execution Flow (Call Stack)

When running `opex-dashboard generate`, the following flow is executed:

1.  **CLI Entry Point** ([src/cli/index.ts](src/cli/index.ts)): Parses command-line arguments using `commander`.
2.  **Generate Command** ([src/cli/commands/generate.ts](src/cli/commands/generate.ts)):
    - Calls `loadConfig` to read and validate the YAML configuration.
    - Downloads the OpenAPI spec if a URL is provided.
    - Initializes `OA3Resolver` with the spec path.
    - Calls `createBuilder` from the factory.
3.  **Configuration Loader** ([src/core/config/loader.ts](src/core/config/loader.ts)): Uses `js-yaml` and `zod` ([src/core/config/config.schema.ts](src/core/config/config.schema.ts)) to ensure the input configuration is valid.
4.  **Resolver** ([src/core/resolver/oa3-resolver.ts](src/core/resolver/oa3-resolver.ts)): Uses `@apidevtools/swagger-parser` to dereference the OpenAPI spec, ensuring all external and internal references are resolved into a single object.
5.  **Builder Factory** ([src/core/builder-factory.ts](src/core/builder-factory.ts)): Instantiates the requested builder type:
    - `azure-dashboard-raw`: Generates the raw Azure Dashboard JSON.
    - `azure-dashboard`: Generates a Terraform module containing the dashboard.
6.  **Builder Execution**:
    - **Raw Builder** ([src/builders/azure-dashboard-raw/builder.ts](src/builders/azure-dashboard-raw/builder.ts)):
      - Calls `extractEndpoints` ([src/builders/azure-dashboard-raw/endpoints-extractor.ts](src/builders/azure-dashboard-raw/endpoints-extractor.ts)) to parse the OpenAPI spec and identify paths, methods, and monitoring requirements.
      - Renders the JSON template ([src/builders/azure-dashboard-raw/template.ts](src/builders/azure-dashboard-raw/template.ts)).
    - **Terraform Builder** ([src/builders/azure-dashboard/builder.ts](src/builders/azure-dashboard/builder.ts)):
      - Uses the Raw Builder to get the dashboard JSON.
      - Wraps the JSON into a Terraform template ([src/builders/azure-dashboard/template.ts](src/builders/azure-dashboard/template.ts)).
7.  **Output Writer** ([src/cli/helpers/output-writer.ts](src/cli/helpers/output-writer.ts)): Writes the final string to `stdout` or creates a structured package on disk if the `--package` flag is used.

## Key Components

### Builders

All builders inherit from the abstract `Builder` class in [src/builders/base.ts](src/builders/base.ts). This ensures a consistent interface for `produce()` (rendering) and `package()` (disk output).

### Queries

The Kusto (KQL) queries used in the dashboards are centralized in [src/builders/queries/](src/builders/queries/).

- [api-management.ts](src/builders/queries/api-management.ts)
- [app-gateway.ts](src/builders/queries/app-gateway.ts)

### Templates

Templates are implemented as TypeScript functions that take a `TemplateContext` and return a string. We avoid complex template engines in favor of type-safe string literals.

### Terraform Asset Generation

Unlike the dashboard JSON which uses templates, the boilerplate Terraform files (`main.tf`, `variables.tf`, etc.) are generated dynamically in [src/builders/azure-dashboard/terraform-assets.ts](src/builders/azure-dashboard/terraform-assets.ts). This allows for programmatic control over provider versions and backend configurations based on the input.

### Asset Loading

The project uses `tsup` to bundle the CLI and library. Non-TypeScript assets like `.kusto` (KQL queries), `.tf` (Terraform files), and `.sh` (Shell scripts) are loaded as plain text using the `tsup` text loader. This allows us to keep these files separate for better syntax highlighting and maintainability while embedding them in the final bundle.

## Extending the Project

### Adding a New Resource Type

1.  Update the `ConfigSchema` in [src/core/config/config.schema.ts](src/core/config/config.schema.ts) to include the new resource type in the enum.
2.  Create a new query file in [src/builders/queries/](src/builders/queries/).
3.  Update the `extractEndpoints` logic if the new resource type requires different metadata extraction.
4.  Update the templates to handle the new resource type's specific dashboard tiles.

### Adding a New Builder Type

1.  Create a new folder under `src/builders/`.
2.  Implement a class extending `Builder`.
3.  Register the new builder in [src/core/builder-factory.ts](src/core/builder-factory.ts).
4.  Update the CLI `generate` command to accept the new template type.

## Development Workflow

### Commands

- `pnpm install`: Install dependencies.
- `pnpm build`: Build the project and generate the JSON schema for configuration files.
- `pnpm test`: Run unit and integration tests.
- `pnpm run typecheck`: Run TypeScript compiler checks.

### Testing Strategy

- **Unit Tests** ([test/unit/](test/unit/)): Test individual components like the config loader, resolver, and utility functions.
- **Integration Tests** ([test/integration/](test/integration/)): Test the full generation flow using sample OpenAPI specs and configurations found in [test/data/](test/data/). These tests often use snapshots to verify the output.

### Configuration Schema

The `config.schema.json` at the root is auto-generated from the Zod schema. Always run `pnpm build` after modifying the schema to keep it in sync.
