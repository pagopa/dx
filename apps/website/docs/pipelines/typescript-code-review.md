---
sidebar_position: 1
sidebar_label: TypeScript Code Review
---

# TypeScript Code Review

The
[TypeScript Code Review workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/js_code_review.yaml)
is used to ensure code quality for TypeScript projects by running type checks,
linting, formatting checks, and test coverage reporting. It leverages `turbo`
for efficient task orchestration across workspaces.

## How It Works

The workflow performs the following steps:

1. **Checks out the code**: Retrieves the repository's code.
2. **Sets up Node.js and Turbo**: Configures the Node.js environment and
   prepares `turbo` for task orchestration using the DX-provided
   [node-setup](https://github.com/pagopa/dx/tree/main/.github/actions/node-setup)
   action.
3. **Installs dependencies**: Ensures all required packages are installed using
   `yarn` with the `--immutable` flag to guarantee a consistent dependency tree.
4. **Runs the `code-review` script**: Executes the `code-review` script defined
   in the root `package.json`, which orchestrates tasks like type checking,
   linting, formatting checks, and optionally test coverage using `turbo`.
5. **Uploads coverage reports**: If the `CODECOV_TOKEN` secret is set, uploads
   test coverage reports to Codecov.

:::info

Ensure that your `package.json` file defines a `code-review` script. This script
should include all necessary checks and leverage `turbo` for task orchestration.
Example:

```json
"scripts": {
  "code-review": "turbo run typecheck format:check lint:check"
}
```

Each task (e.g., `typecheck`, `format:check`, `lint:check`) should be defined in
the respective workspace `package.json` files.

:::

## Usage

To use the TypeScript Code Review workflow, invoke it as a reusable workflow in
your repository. Below is an example configuration:

```yaml
name: Code Review

on:
  pull_request:

jobs:
  code_review:
    uses: pagopa/dx/.github/workflows/js_code_review.yaml@main
    name: Code Review
    secrets: inherit
```

### Notes

- **Turbo Integration**: The workflow relies on `turbo` to efficiently run tasks
  across multiple workspaces. Ensure `turbo` is installed as a dev dependency in
  the root `package.json`.
- **Code Coverage**: To enable Codecov integration, set the `CODECOV_TOKEN`
  secret in your repository.
- **Dependency Management**: The workflow uses `yarn install --immutable` to
  ensure a consistent dependency tree. Make sure your `yarn.lock` file is
  up-to-date.
- **Turbo Cache**: The workflow uses a `TURBO_CACHE_DIR` environment variable to
  optimize task execution. Ensure your project is configured to leverage turbo
  caching effectively.
