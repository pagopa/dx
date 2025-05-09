---
sidebar_position: 1
---

# Using the Code Review Workflow (legacy)

The
[Code Review - Legacy workflow](https://github.com/pagopa/dx/blob/main/.github/workflows/legacy_code_review.yaml)
is used to perform code quality checks for **Node.js** projects.

:::caution

This workflow has been deprecated as part of the migration to a monorepo
architecture.

:::

## How It Works

The workflow performs the following steps:

1. Checks out the code from the repository.
2. Sets up `Node.js` and enables `Corepack` for managing package managers.
3. Installs dependencies and builds the project.
4. Runs linting and API linting checks.
5. Generates API definitions.
6. Executes unit tests and uploads coverage reports to Codecov.

:::info

Ensure that `yarn` is properly configured in your project with the necessary
scripts for linting, testing, and generating API definitions. The `package.json`
file must define the following npm tasks:

- `lint`: To run code linting.
- `lint-api`: To validate API specifications.
- `generate`: To generate API models or definitions.
- `test:coverage`: To execute tests and generate coverage reports.

These scripts are required for the workflow to function as expected.

:::

## Usage

To use the Code Review workflow, invoke it as a reusable workflow in your
repository. Below is an example configuration:

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

- Ensure that your project includes scripts for linting, testing, and generating
  API definitions.
- To enable Codecov integration, set the `CODECOV_TOKEN` secret in your
  repository.
