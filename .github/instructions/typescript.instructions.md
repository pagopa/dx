---
description: This file describes the TypeScript code style for the project.
applyTo: "**/*.ts, **/*.js, package.json"
---

# Copilot Guidelines for TypeScript Code

## General Rules

- Use kebab-case for file and folder names.
- Use named exports; avoid default exports.
- Keep modules free of side effects: export values and functions without executing code at import time.
- Do not access `process.env` outside an entrypoint; pass configuration through parameters.
- Use `@pagopa/eslint-config` for consistent linting rules.
- Keep modules and functions small and single-responsibility. Methods should fit within a single screen.
- Do not create global utility or types packages; keep helpers and types close to where they are used.
- Avoid barrel files; import directly from source files.
- Add a short file header that states the module purpose.
- Prefer `const`, immutable structures, and pure functions over `let`/`var` mutations.
- Use `async/await` for asynchronous code for clarity.
- Document non-obvious decisions and the rationale (the "why") in comments.
- Follow existing naming and style conventions used in similar files.
- Always validate external inputs and external data with zod schemas.
- For new code, use zod v4; when editing existing code, keep that package's current zod major version until explicitly migrated.
- Prefer `.safeParse()` for synchronous zod validation and handle both success and failure paths.
- Avoid deeply nested control flow; prefer early returns or small helper functions.
- Use asynchronous functions for I/O-bound operations.
- Favor dependency injection over instantiating collaborators with `new` inside methods.
- Avoid `as` casts, especially to `any`; prefer zod validation or explicit type guards instead.
- Use ES Modules (`import`/`export`) and include `.js`/`.ts` extensions in new code.

## NodeJS

When coding for NodeJS environments:

- Always prefer NodeJS built-in modules over implementing custom logic (e.g., use `assert` module instead of writing custom assertion functions)
- Code for NodeJS must be compatible with the version specified in the root `.node-version` file

## Dependencies

- Use catalog versions from [pnpm-workspace.yaml](../../pnpm-workspace.yaml) for common packages
- Add dependencies: `pnpm --filter <workspace-name> add <package-name>`
- Add root-level dependencies: `pnpm add -w <package-name>`
