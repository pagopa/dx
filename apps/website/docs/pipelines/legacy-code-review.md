---
sidebar_position: 1
sidebar_label: Code Review - Legacy
---

# Code Review - Legacy

The [Code Review - Legacy workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/legacy_code_review.yaml) is used to perform code quality checks for projects that still rely on a legacy architecture.

:::note

This workflow will eventually be deprecated as part of the migration to a monorepo architecture.

:::

## How It Works

The workflow performs the following steps:

1. Checks out the code from the repository.
2. Sets up `Node.js` and enables `Corepack` for managing package managers.
3. Installs dependencies and builds the project.
4. Runs linting and API linting checks.
5. Generates API definitions.
6. Executes unit tests and uploads coverage reports to Codecov.

## Usage

To use the Code Review workflow, you can invoke it as a reusable workflow in your repository. Below is an example configuration:

```yaml
name: Code Review

on:
  pull_request:

jobs:
  code_review:
    uses: pagopa/dx/.github/workflows/legacy_code_review.yaml@main
    name: Code Review
    secrets: inherit
```

### Notes

- Ensure that your project includes scripts for linting, testing, and generating API definitions.
- To enable Codecov integration, set the `CODECOV_TOKEN` secret in your repository.

:::warning

Make sure to configure the necessary secrets and permissions for this workflow to function correctly.

:::
