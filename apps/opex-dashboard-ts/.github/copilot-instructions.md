# OpEx Dashboard - AI Coding Agent Instructions

## Project Overview

OpEx Dashboard generates standardized operational dashboards (Azure, AWS CloudWatch, Grafana) from OpenAPI 3 specs. It parses OA3 specs to automatically create availability, response codes, and response time graphs/alarms for each endpoint.

**Architecture pattern**: CLI tool → Builder Factory → Template Rendering

- Input: OpenAPI spec + YAML config → Output: Terraform/JSON dashboard definitions
- Supports Azure Application Gateway and API Management monitoring
- Generates both raw JSON dashboards and packaged Terraform deployments

## Core Architecture

### Builder Pattern Implementation
- **Base Builder** (`src/builders/base.ts`): Abstract class defining `produce()` and `package()` methods
- **Concrete Builders**:
  - `AzDashboardRawBuilder`: Generates JSON dashboard definitions
  - `AzDashboardBuilder`: Wraps raw builder + adds Terraform packaging support
- **Factory Pattern** (`src/core/builder-factory.ts`): Type-safe registry mapping template types to builder creation functions

### Data Flow
1. **Config Loading**: YAML config validated with Zod schemas (`src/core/config/`)
2. **OA3 Resolution**: Swagger-parser dereferences OpenAPI specs (`src/core/resolver/`)
3. **Builder Creation**: Factory creates appropriate builder with resolved spec
4. **Template Rendering**: Context merged with overrides, rendered via template functions
5. **Output**: JSON to stdout or packaged Terraform files

### Key Components
- **CLI** (`src/cli/`): Commander.js commands with generate handler
- **Config System**: Zod-validated YAML configs with auto-generated JSON schema
- **Template Engine**: Context-based rendering with custom filters (`src/tags/`)
- **Utils**: Deep merge for overrides (`overrideWith`), parameter normalization

## Developer Workflows

### Build & Development
```bash
pnpm install                    # Install dependencies
pnpm run generate:schema        # Auto-generate config.schema.json from Zod
pnpm run build                  # Bundle with tsup (ESM output)
pnpm run dev                    # Watch mode for development
```

### Testing
```bash
pnpm test                      # Run all tests (unit + integration)
pnpm run test:coverage         # Coverage report (80% thresholds)
pnpm run test:unit             # Unit tests only
pnpm run test:integration      # Integration tests only
pnpm run test:watch            # TDD watch mode
```

### Code Quality
```bash
pnpm run lint                  # ESLint with auto-fix
pnpm run lint:check            # Lint check only
pnpm run format                # Prettier format
pnpm run format:check          # Format check only
pnpm run typecheck             # TypeScript compilation check
```

## Project-Specific Patterns

### Configuration & Validation
- **Zod Schemas**: Runtime validation for all config and template contexts
- **Auto-generated Schema**: `config.schema.json` created from TypeScript types for IDE support
- **Colocated Schemas**: `*.schema.ts` files define and export Zod schemas alongside types
- **YAML Config**: `# yaml-language-server: $schema=./config.schema.json` for validation

### Template System
- **Context Merging**: `overrideWith()` deep merges base properties with endpoint-specific overrides
- **Custom Filters**: Template tags in `src/tags/` (e.g., `uriToRegex` converts paths to regex patterns)
- **Deterministic Ordering**: Parallel rendering with consistent output order

### Error Handling
- **Custom Errors**: Domain-specific error classes in `src/core/errors/`
- **Parse Errors**: OA3 resolution failures wrapped in `ParseError`
- **Config Errors**: Validation failures with descriptive messages

### File Organization
- **Small Files**: Keep modules <200 lines, focused responsibilities
- **Central Exports**: `index.ts` files re-export public APIs
- **File Headers**: Every file starts with `/** Module purpose description */`
- **Strict TypeScript**: No `any` types, use `unknown` with type guards

### CLI Patterns
- **Commander.js**: Declarative command definition with required/optional options
- **Async Handlers**: All command handlers are async for OA3 resolution
- **Temp File Cleanup**: HTTP specs downloaded to temp files, cleaned up after use
- **Stdout vs Package**: Output to console or directory-based packaging

## Integration Points

### External Dependencies
- **swagger-parser**: OA3 spec parsing and $ref resolution
- **commander**: CLI argument parsing
- **js-yaml**: Configuration file loading
- **zod**: Runtime type validation

### Azure Resources
- **Application Gateway**: Metrics queries for app-gateway resource type
- **API Management**: Metrics queries for api-management resource type
- **Action Groups**: Alarm notification targets
- **Terraform Backend**: Azure blob storage for state management

### Template Assets
- **JSON Templates**: Raw dashboard definitions in `assets/templates/`
- **Terraform Boilerplate**: Deployment scaffolding in `assets/terraform/`
- **Query Templates**: Resource-specific KQL queries in `assets/templates/queries/`

## Code Review Guidelines

When reviewing code, please consider the following guidelines:

- Be extremely frank and outspoken about potential issues, improvements, and edge cases. Do not hold back constructive criticism or suggestions. Have no fear of hurting feelings and use a direct communication style even if it may seem blunt, uncomfortable or unpolite.
