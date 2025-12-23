---
description: This file describes the TypeScript code style for the project.
applyTo: **/*.ts, **/*.js, package.json
---

# Copilot Guidelines for TypeScript Code

- Prefer named exports over default exports
- Use `@pagopa/eslint-config` for consistent linting
- Modules and methods should be small and single-concern focused
- Avoid barrel files; import directly from source files
- Add file header comments explaining module purpose
- Prefer const, immutable data structures and pure functions over let/var mutations
- Use async/await for asynchronous code
- Document complex logic with comments that explain the "why"
- Follow existing naming conventions in similar files
- For new code, prefer [zod v4](https://zod.dev/v4) for schema validation (e.g., input validation, API responses, environment variables); when modifying existing code, follow the zod major version already used in that package until it is explicitly migrated
- Avoid nesting too many control structures; consider early returns or helper functions

## Dependencies

- Use catalog versions from [pnpm-workspace.yaml](../../pnpm-workspace.yaml) for common packages
- Add dependencies: `pnpm --filter <workspace-name> add <package-name>`
- Add root-level dependencies: `pnpm add -w <package-name>`

## Testing

- Test files co-located with source using Vitest
- Try hard not to cheat type safety in tests; the `as` keyword must NEVER used in a test file.
- Arrange tests in Arrange-Act-Assert pattern
- Do not mangle tests only to make them pass
- Mock external dependencies and side effects instead of internal logic
- Use descriptive test names that explain the expected behavior
