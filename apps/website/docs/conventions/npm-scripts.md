---
sidebar_position: 3
---

# Naming Convention for npm Scripts

## Context

Node.js compatible package managers, such as npm and Yarn, support the
definition of "package scripts," which function as simple task runners. However,
without shared guidelines for naming and structuring these scripts, several
issues arise:

- Projects have inconsistent naming for scripts (e.g., `watch`, `build:watch`,
  `docker-start`, etc.), making it harder to onboard engineers or write
  abstractions (like pipelines) that work across multiple projects.
- Many scripts are overly complex or trigger unintended side effects, making
  maintenance difficult.
- Some scripts rely on external tools (e.g., Docker) not handled by the package
  manager, which adds configuration overhead.

To resolve these issues, adopting a consistent naming convention and following a
set of guidelines is proposed.

:::info

By adopting a naming convention for package scripts, we can enforce a common
interface for all projects. This "Convention over Configuration" approach
simplifies writing project-agnostic abstractions like CI pipelines.

:::

### Examples of Script Naming

| Script Name       | Description                                                 | Example Implementation                                                       |
| ----------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `start`           | Runs the Node.js application defined in `package.json`.     | `node .`                                                                     |
| `test`            | Executes unit tests.                                        | `vitest run`                                                                 |
| `test:coverage`   | Runs unit tests and generates code coverage reports.        | `vitest run --coverage`                                                      |
| `build`           | Compiles the project for production.                        | `tsc`, `next build`                                                          |
| `build:watch`     | Watches for file changes and rebuilds the project.          | `build --watch`                                                              |
| `typecheck`       | Performs type checking on TypeScript code.                  | `tsc --noEmit`                                                               |
| `bundle`          | Packages the project into a deployable format (e.g., ZIP).  | `npm-pack-zip`, `yarn bundle`                                                |
| `format`          | Formats the project's files according to the style guide.   | `prettier --write .`                                                         |
| `format:check`    | Verifies adherence to the style guide without reformatting. | `prettier --check .`                                                         |
| `lint`            | Lints the code and fixes auto-fixable issues.               | `eslint --fix "src/**"`                                                      |
| `lint:check`      | Lints the code without applying fixes.                      | `eslint "src/**"`                                                            |
| `generate:<name>` | Generates files needed by the project (e.g., API models).   | `gen-api-models --api-spec ./openapi.yaml --out-dir ./src/infra/http/models` |

:::note

Projects are not required to implement _all_ of these scripts. Instead, focus on
maintaining consistent naming. For example, use `format` instead of `prettify`.

:::

## Guidelines for npm Scripts

1. **Self-contained commands:** All commands in scripts should be executable
   after installing dependencies via `npm install` or `yarn`. They should not
   rely on globally installed tools (e.g., `brew`, `pip`). If external tools are
   needed, use a task runner (e.g., `make`) to wrap the scripts.
2. **Simplicity and atomicity:** Scripts should be as simple as possible. If a
   script becomes too complex, consider moving it to a separate JavaScript file.
   Keep scripts atomic, meaning they should focus on doing one task at a time.
3. **Avoid lifecycle hooks:** Hooks like `prebuild` or `postinstall` introduce
   side effects and slow down the developer experience. For instance, running
   `build` should not always trigger `generate` if it’s not necessary.
4. **Limit `npm-run-all` usage:** Scripts should perform one task only. Leave
   the decision of what to run up to the developer, rather than chaining
   commands excessively with `npm-run-all`. If advanced task coordination is
   needed, use tools like `turborepo`.
